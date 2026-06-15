"""Backend API tests for the Rutas Eficientes (Google My Maps Planner) app."""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None
if not BASE_URL:
    # Fallback: read from frontend/.env
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')

API = f"{BASE_URL}/api"


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ============================================================
# Categories
# ============================================================
class TestCategories:
    def test_get_categories(self, api_client):
        r = api_client.get(f"{API}/categories", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 7
        required_keys = {"id", "name", "weight", "duration_min", "color"}
        for c in data:
            assert required_keys.issubset(c.keys())
        ids = {c["id"] for c in data}
        assert {"museo", "monumento", "atraccion", "parque", "restaurante", "compras", "otro"}.issubset(ids)


# ============================================================
# Import KML
# ============================================================
class TestImportKml:
    def test_invalid_url_returns_400(self, api_client):
        r = api_client.post(f"{API}/import-kml", json={"url": "https://example.com/nope"}, timeout=30)
        assert r.status_code == 400
        assert "detail" in r.json()

    def test_empty_url_returns_400(self, api_client):
        r = api_client.post(f"{API}/import-kml", json={"url": ""}, timeout=30)
        assert r.status_code == 400

    def test_valid_mymap_url(self, api_client):
        """Try a public My Maps URL. Google may block sandboxed egress, so accept 200 or 400."""
        url = "https://www.google.com/maps/d/viewer?mid=1Pl9VRpkqJUmM52Vdr4_4mUBP-cb-XJDB"
        r = api_client.post(f"{API}/import-kml", json={"url": url}, timeout=60)
        # Accept either success or backend-handled 400 (egress blocked); fail only on 500
        assert r.status_code in (200, 400), f"unexpected status {r.status_code}: {r.text}"
        if r.status_code == 200:
            data = r.json()
            assert data["map_id"] == "1Pl9VRpkqJUmM52Vdr4_4mUBP-cb-XJDB"
            assert "embed_url" in data and "embed?mid=" in data["embed_url"]
            assert isinstance(data["points"], list)


# ============================================================
# Optimize Route
# ============================================================
def _cats():
    return [
        {"id": "museo", "name": "Museo", "weight": 5, "duration_min": 90, "color": "#b45309"},
        {"id": "parque", "name": "Parque", "weight": 3, "duration_min": 60, "color": "#059669"},
        {"id": "otro", "name": "Otro", "weight": 1, "duration_min": 30, "color": "#57534e"},
    ]


def _sample_points():
    return [
        {"id": "p1", "name": "Prado", "lat": 40.4138, "lng": -3.6921, "category_id": "museo"},
        {"id": "p2", "name": "Retiro", "lat": 40.4153, "lng": -3.6844, "category_id": "parque"},
        {"id": "p3", "name": "Sol", "lat": 40.4168, "lng": -3.7038, "category_id": "otro"},
        {"id": "p4", "name": "Reina Sofia", "lat": 40.4080, "lng": -3.6946, "category_id": "museo"},
    ]


class TestOptimize:
    def test_empty_points_does_not_crash(self, api_client):
        r = api_client.post(f"{API}/optimize-route", json={
            "points": [], "categories": _cats(), "total_hours": 8, "speed_kmh": 5, "return_to_start": False,
        }, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["stops"] == []
        assert d["total_time_min"] == 0
        assert d["total_distance_km"] == 0
        assert d["total_weight"] == 0
        assert d["skipped"] == []

    def test_full_route_fits(self, api_client):
        r = api_client.post(f"{API}/optimize-route", json={
            "points": _sample_points(), "categories": _cats(), "total_hours": 8, "speed_kmh": 5, "return_to_start": False,
        }, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert len(d["stops"]) >= 1
        # arrival/depart times monotonically increasing
        prev_depart = -1
        for s in d["stops"]:
            assert s["arrival_min"] >= prev_depart - 0.01
            assert s["depart_min"] >= s["arrival_min"]
            prev_depart = s["depart_min"]
        # total_weight == sum of stop weights
        assert abs(d["total_weight"] - sum(s["weight"] for s in d["stops"])) < 0.01

    def test_skipped_when_budget_tiny(self, api_client):
        r = api_client.post(f"{API}/optimize-route", json={
            "points": _sample_points(), "categories": _cats(), "total_hours": 0.5, "speed_kmh": 5, "return_to_start": False,
        }, timeout=30)
        assert r.status_code == 200
        d = r.json()
        # At least some skipped because we have 4 points and 30 minutes (museo alone needs 90 min)
        assert len(d["skipped"]) > 0
        assert len(d["stops"]) + len(d["skipped"]) == 4

    def test_return_to_start_increases_distance(self, api_client):
        payload_no = {
            "points": _sample_points(), "categories": _cats(), "total_hours": 8, "speed_kmh": 5, "return_to_start": False,
        }
        payload_yes = {**payload_no, "return_to_start": True}
        r1 = api_client.post(f"{API}/optimize-route", json=payload_no, timeout=30).json()
        r2 = api_client.post(f"{API}/optimize-route", json=payload_yes, timeout=30).json()
        # If both selected the same set, returning to start must increase distance
        if {s["point"]["id"] for s in r1["stops"]} == {s["point"]["id"] for s in r2["stops"]} and r1["stops"]:
            assert r2["total_distance_km"] >= r1["total_distance_km"]


# ============================================================
# Itineraries CRUD
# ============================================================
@pytest.fixture
def saved_itinerary_id(api_client):
    name = f"TEST_itin_{uuid.uuid4().hex[:8]}"
    payload = {
        "name": name,
        "map_url": "https://www.google.com/maps/d/viewer?mid=TEST",
        "embed_url": "https://www.google.com/maps/d/embed?mid=TEST",
        "points": _sample_points(),
        "categories": _cats(),
        "settings": {"total_hours": 8, "speed_kmh": 5, "return_to_start": False, "start_lat": None, "start_lng": None},
        "result": {
            "stops": [], "total_time_min": 0, "total_distance_km": 0, "total_weight": 0, "skipped": [],
        },
    }
    r = api_client.post(f"{API}/itineraries", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["name"] == name
    assert "id" in body
    yield body["id"], name
    # cleanup
    api_client.delete(f"{API}/itineraries/{body['id']}", timeout=30)


class TestItineraries:
    def test_create_and_get(self, api_client, saved_itinerary_id):
        itin_id, name = saved_itinerary_id
        r = api_client.get(f"{API}/itineraries/{itin_id}", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == itin_id
        assert d["name"] == name
        assert "created_at" in d

    def test_list_includes_saved(self, api_client, saved_itinerary_id):
        itin_id, _ = saved_itinerary_id
        r = api_client.get(f"{API}/itineraries", timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert any(i["id"] == itin_id for i in items)
        # Ensure no Mongo _id leak in any item
        for i in items:
            assert "_id" not in i

    def test_delete(self, api_client):
        # create fresh
        name = f"TEST_del_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": name, "points": [], "categories": _cats(), "settings": {},
            "result": {"stops": [], "total_time_min": 0, "total_distance_km": 0, "total_weight": 0, "skipped": []},
        }
        r = api_client.post(f"{API}/itineraries", json=payload, timeout=30)
        assert r.status_code == 200
        itin_id = r.json()["id"]
        # delete
        r = api_client.delete(f"{API}/itineraries/{itin_id}", timeout=30)
        assert r.status_code == 200
        assert r.json().get("deleted") is True
        # subsequent GET must return 404
        r = api_client.get(f"{API}/itineraries/{itin_id}", timeout=30)
        assert r.status_code == 404

    def test_delete_nonexistent_returns_404(self, api_client):
        r = api_client.delete(f"{API}/itineraries/does-not-exist", timeout=30)
        assert r.status_code == 404
