from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import math
import logging
import uuid
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

import httpx
from fastapi import Body
from pydantic import BaseModel, Field, ConfigDict


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Mongo
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Rutas eficientes - Google My Maps")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============================================================
# DEFAULT CATEGORIES (Spanish UI)
# ============================================================
DEFAULT_CATEGORIES: List[Dict[str, Any]] = [
    {"id": "museos",             "name": "MUSEOS",             "weight": 0, "duration_min": 120, "color": "#b45309"},
    {"id": "galerias",           "name": "GALERÍAS",           "weight": 0, "duration_min": 60,  "color": "#92400e"},
    {"id": "fundaciones",        "name": "FUNDACIONES",        "weight": 0, "duration_min": 45,  "color": "#a16207"},
    {"id": "teatro",             "name": "TEATRO",             "weight": 0, "duration_min": 120, "color": "#9333ea"},
    {"id": "gastronomicos",      "name": "GASTRONÓMICOS",      "weight": 0, "duration_min": 75,  "color": "#dc2626"},
    {"id": "deportes",           "name": "DEPORTES",           "weight": 0, "duration_min": 60,  "color": "#0891b2"},
    {"id": "centros_culturales", "name": "CENTROS CULTURALES", "weight": 0, "duration_min": 30,  "color": "#c2410c"},
    {"id": "librerias",          "name": "LIBRERÍAS",          "weight": 0, "duration_min": 30,  "color": "#65a30d"},
    {"id": "cine",               "name": "CINE",               "weight": 0, "duration_min": 135, "color": "#7c3aed"},
    {"id": "paseo",              "name": "PASEO",              "weight": 0, "duration_min": 15,  "color": "#059669"},
    {"id": "otros",              "name": "OTROS",              "weight": 0, "duration_min": 30,  "color": "#57534e"},
]


def _normalize(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode("ascii")
    s = s.lower().strip()
    s = re.sub(r"\s+", "_", s)
    return s


CATEGORY_BY_NORM_NAME = {_normalize(c["name"]): c["id"] for c in DEFAULT_CATEGORIES}


def category_from_layer(folder_name: str) -> str:
    """Match a KML folder/layer name to one of our category IDs."""
    if not folder_name:
        return "otros"
    norm = _normalize(folder_name)
    if norm in CATEGORY_BY_NORM_NAME:
        return CATEGORY_BY_NORM_NAME[norm]
    # heuristic: substring match
    for known_norm, cat_id in CATEGORY_BY_NORM_NAME.items():
        if known_norm and known_norm in norm:
            return cat_id
    return "otros"


# ============================================================
# MODELS
# ============================================================
class Category(BaseModel):
    id: str
    name: str
    weight: float
    duration_min: int
    color: str


class Point(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    lat: float
    lng: float
    category_id: str = "otro"
    custom_duration_min: Optional[int] = None  # override category default


class ImportKmlRequest(BaseModel):
    url: str


class ImportKmlResponse(BaseModel):
    map_id: Optional[str]
    embed_url: Optional[str]
    points: List[Point]


class OptimizeRequest(BaseModel):
    points: List[Point]
    categories: List[Category]
    total_hours: float = 8.0
    speed_kmh: float = 5.0  # walking
    start_lat: Optional[float] = None  # if None, use first point
    start_lng: Optional[float] = None
    return_to_start: bool = False


class ItineraryStop(BaseModel):
    point: Point
    arrival_min: float
    depart_min: float
    travel_min_from_prev: float
    distance_km_from_prev: float
    weight: float


class OptimizeResponse(BaseModel):
    stops: List[ItineraryStop]
    total_time_min: float
    total_distance_km: float
    total_weight: float
    skipped: List[Point]


class SaveItineraryRequest(BaseModel):
    name: str
    map_url: Optional[str] = None
    embed_url: Optional[str] = None
    points: List[Point]
    categories: List[Category]
    settings: Dict[str, Any]
    result: OptimizeResponse


class Itinerary(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    map_url: Optional[str] = None
    embed_url: Optional[str] = None
    points: List[Point]
    categories: List[Category]
    settings: Dict[str, Any]
    result: OptimizeResponse
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============================================================
# KML PARSING HELPERS
# ============================================================
def extract_map_id(url: str) -> Optional[str]:
    """Extract a Google My Maps `mid` parameter from any common URL shape."""
    if not url:
        return None
    # mid as query param
    m = re.search(r"[?&]mid=([^&#]+)", url)
    if m:
        return m.group(1)
    # path like /maps/d/<something>/<mid>
    m = re.search(r"/maps/d/[^/]+/([A-Za-z0-9_\-]+)", url)
    if m:
        return m.group(1)
    # Maybe user pasted the id directly
    if re.fullmatch(r"[A-Za-z0-9_\-]{20,}", url.strip()):
        return url.strip()
    return None


def _parse_placemark(pm, category_id: str) -> Optional[Point]:
    pt = pm.find("Point")
    if pt is None:
        return None
    coord_el = pt.find("coordinates")
    if coord_el is None or coord_el.text is None:
        return None
    coords_text = coord_el.text.strip()
    try:
        parts = coords_text.split(",")
        lng = float(parts[0])
        lat = float(parts[1])
    except (ValueError, IndexError):
        return None
    name_el = pm.find("name")
    desc_el = pm.find("description")
    name = (name_el.text or "Sin nombre").strip() if name_el is not None and name_el.text else "Sin nombre"
    desc = (desc_el.text or "").strip() if desc_el is not None and desc_el.text else ""
    desc = re.sub(r"<[^>]+>", " ", desc)
    desc = re.sub(r"\s+", " ", desc).strip()[:300]
    return Point(
        name=name,
        description=desc,
        lat=lat,
        lng=lng,
        category_id=category_id,
    )


def parse_kml(kml_text: str) -> List[Point]:
    """Parse a KML document. Categories are derived from the Folder/Layer the placemark lives in."""
    try:
        kml_text = re.sub(r'\sxmlns="[^"]+"', '', kml_text, count=1)
        root = ET.fromstring(kml_text)
    except ET.ParseError as e:
        raise HTTPException(status_code=400, detail=f"KML inválido: {e}")

    points: List[Point] = []
    seen_ids = set()

    # Walk all folders and tag placemarks with that folder's category.
    for folder in root.iter("Folder"):
        folder_name_el = folder.find("name")
        folder_name = (folder_name_el.text or "").strip() if folder_name_el is not None and folder_name_el.text else ""
        cat_id = category_from_layer(folder_name)
        for pm in folder.findall("Placemark"):
            p = _parse_placemark(pm, cat_id)
            if p:
                points.append(p)
                seen_ids.add(id(pm))

    # Handle placemarks not inside any Folder
    for pm in root.iter("Placemark"):
        if id(pm) in seen_ids:
            continue
        p = _parse_placemark(pm, "otros")
        if p:
            points.append(p)

    return points


# ============================================================
# DISTANCE + OPTIMIZATION
# ============================================================
def haversine_km(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    R = 6371.0
    p1 = math.radians(a_lat)
    p2 = math.radians(b_lat)
    dp = math.radians(b_lat - a_lat)
    dl = math.radians(b_lng - a_lng)
    h = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(h))


def optimize_route(req: OptimizeRequest) -> OptimizeResponse:
    cat_map = {c.id: c for c in req.categories}

    def duration_of(p: Point) -> int:
        if p.custom_duration_min is not None:
            return p.custom_duration_min
        c = cat_map.get(p.category_id)
        return c.duration_min if c else 30

    def weight_of(p: Point) -> float:
        c = cat_map.get(p.category_id)
        return float(c.weight) if c else 1.0

    if not req.points:
        return OptimizeResponse(stops=[], total_time_min=0, total_distance_km=0, total_weight=0, skipped=[])

    start_lat = req.start_lat if req.start_lat is not None else req.points[0].lat
    start_lng = req.start_lng if req.start_lng is not None else req.points[0].lng

    budget_min = req.total_hours * 60.0
    speed_kmh = max(0.1, req.speed_kmh)

    available = list(req.points)
    stops: List[ItineraryStop] = []
    cur_lat, cur_lng = start_lat, start_lng
    time_used = 0.0
    total_dist = 0.0

    # Greedy value-density insertion
    while available:
        best = None
        best_score = -math.inf
        best_travel_min = 0.0
        best_dist = 0.0
        for p in available:
            dist = haversine_km(cur_lat, cur_lng, p.lat, p.lng)
            travel_min = (dist / speed_kmh) * 60.0
            visit_min = duration_of(p)
            extra_back = 0.0
            if req.return_to_start:
                dist_back = haversine_km(p.lat, p.lng, start_lat, start_lng)
                extra_back = (dist_back / speed_kmh) * 60.0
            if time_used + travel_min + visit_min + extra_back > budget_min:
                continue
            w = weight_of(p)
            # Add a +1 base so weight-0 points are still selectable when no preferences are set.
            score = (w + 1.0) / max(0.5, (travel_min + visit_min))
            if score > best_score:
                best_score = score
                best = p
                best_travel_min = travel_min
                best_dist = dist
        if best is None:
            break
        visit_min = duration_of(best)
        arrival = time_used + best_travel_min
        depart = arrival + visit_min
        stops.append(ItineraryStop(
            point=best,
            arrival_min=arrival,
            depart_min=depart,
            travel_min_from_prev=best_travel_min,
            distance_km_from_prev=best_dist,
            weight=weight_of(best),
        ))
        time_used = depart
        total_dist += best_dist
        cur_lat, cur_lng = best.lat, best.lng
        available = [a for a in available if a.id != best.id]

    # 2-opt local improvement on travel (keep weights identical)
    def total_travel_min(seq: List[ItineraryStop]) -> float:
        s_lat, s_lng = start_lat, start_lng
        total = 0.0
        for st in seq:
            d = haversine_km(s_lat, s_lng, st.point.lat, st.point.lng)
            total += (d / speed_kmh) * 60.0
            s_lat, s_lng = st.point.lat, st.point.lng
        if req.return_to_start:
            d = haversine_km(s_lat, s_lng, start_lat, start_lng)
            total += (d / speed_kmh) * 60.0
        return total

    improved = True
    iter_guard = 0
    while improved and iter_guard < 30:
        improved = False
        iter_guard += 1
        for i in range(len(stops) - 1):
            for j in range(i + 1, len(stops)):
                new_seq = stops[:i] + stops[i:j+1][::-1] + stops[j+1:]
                if total_travel_min(new_seq) + 0.01 < total_travel_min(stops):
                    stops = new_seq
                    improved = True

    # Recompute arrival/depart after reordering
    s_lat, s_lng = start_lat, start_lng
    t = 0.0
    total_dist = 0.0
    final_stops: List[ItineraryStop] = []
    for st in stops:
        d = haversine_km(s_lat, s_lng, st.point.lat, st.point.lng)
        tm = (d / speed_kmh) * 60.0
        arrival = t + tm
        visit = duration_of(st.point)
        depart = arrival + visit
        final_stops.append(ItineraryStop(
            point=st.point,
            arrival_min=arrival,
            depart_min=depart,
            travel_min_from_prev=tm,
            distance_km_from_prev=d,
            weight=weight_of(st.point),
        ))
        total_dist += d
        t = depart
        s_lat, s_lng = st.point.lat, st.point.lng

    if req.return_to_start and final_stops:
        d_back = haversine_km(s_lat, s_lng, start_lat, start_lng)
        total_dist += d_back
        t += (d_back / speed_kmh) * 60.0

    chosen_ids = {s.point.id for s in final_stops}
    skipped = [p for p in req.points if p.id not in chosen_ids]
    total_weight = sum(s.weight for s in final_stops)

    return OptimizeResponse(
        stops=final_stops,
        total_time_min=round(t, 2),
        total_distance_km=round(total_dist, 3),
        total_weight=round(total_weight, 2),
        skipped=skipped,
    )


# ============================================================
# ROUTES
# ============================================================
@api_router.get("/")
async def root():
    return {"message": "Rutas eficientes - Google My Maps API"}


@api_router.get("/categories", response_model=List[Category])
async def get_default_categories():
    return [Category(**c) for c in DEFAULT_CATEGORIES]


@api_router.post("/import-kml", response_model=ImportKmlResponse)
async def import_kml(req: ImportKmlRequest):
    map_id = extract_map_id(req.url)
    if not map_id:
        raise HTTPException(status_code=400, detail="No se pudo extraer el ID del mapa. Comparte un My Map público y pega su enlace.")
    kml_url = f"https://www.google.com/maps/d/kml?mid={map_id}&forcekml=1"
    embed_url = f"https://www.google.com/maps/d/embed?mid={map_id}"
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=20.0) as http:
            r = await http.get(kml_url)
            if r.status_code != 200 or not r.text:
                raise HTTPException(status_code=400, detail="No se pudo descargar el KML. Asegúrate que el mapa sea público.")
            kml_text = r.text
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Error al descargar el KML: {e}")
    points = parse_kml(kml_text)
    if not points:
        raise HTTPException(status_code=400, detail="No se encontraron puntos en este mapa. Asegúrate que tenga marcadores y sea público.")
    return ImportKmlResponse(map_id=map_id, embed_url=embed_url, points=points)


@api_router.post("/optimize-route", response_model=OptimizeResponse)
async def optimize_route_endpoint(req: OptimizeRequest):
    return optimize_route(req)


@api_router.post("/itineraries", response_model=Itinerary)
async def save_itinerary(req: SaveItineraryRequest):
    it = Itinerary(
        name=req.name,
        map_url=req.map_url,
        embed_url=req.embed_url,
        points=req.points,
        categories=req.categories,
        settings=req.settings,
        result=req.result,
    )
    doc = it.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.itineraries.insert_one(doc)
    return it


@api_router.get("/itineraries", response_model=List[Itinerary])
async def list_itineraries():
    docs = await db.itineraries.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    for d in docs:
        if isinstance(d.get("created_at"), str):
            try:
                d["created_at"] = datetime.fromisoformat(d["created_at"])
            except ValueError:
                d["created_at"] = datetime.now(timezone.utc)
    return docs


@api_router.get("/itineraries/{itinerary_id}", response_model=Itinerary)
async def get_itinerary(itinerary_id: str):
    doc = await db.itineraries.find_one({"id": itinerary_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Itinerario no encontrado")
    if isinstance(doc.get("created_at"), str):
        try:
            doc["created_at"] = datetime.fromisoformat(doc["created_at"])
        except ValueError:
            doc["created_at"] = datetime.now(timezone.utc)
    return doc


@api_router.delete("/itineraries/{itinerary_id}")
async def delete_itinerary(itinerary_id: str):
    res = await db.itineraries.delete_one({"id": itinerary_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Itinerario no encontrado")
    return {"deleted": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
