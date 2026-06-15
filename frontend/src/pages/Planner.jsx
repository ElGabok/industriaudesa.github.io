import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Compass } from "lucide-react";

import LeftPanel from "@/components/planner/LeftPanel";
import MapPanel from "@/components/planner/MapPanel";
import ItineraryPanel from "@/components/planner/ItineraryPanel";
import { fetchCategories, importKml, optimizeRoute, saveItinerary, listItineraries, getItinerary, deleteItinerary } from "@/lib/api";

export default function Planner() {
  const [mapUrl, setMapUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [points, setPoints] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({
    total_hours: 8,
    speed_kmh: 5,
    return_to_start: false,
    start_lat: null,
    start_lng: null,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [savedList, setSavedList] = useState([]);

  // load default categories
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    refreshSaved();
  }, []);

  const refreshSaved = async () => {
    try {
      const list = await listItineraries();
      setSavedList(list);
    } catch (e) {
      // silent
    }
  };

  const handleImport = async (url) => {
    setImporting(true);
    try {
      const data = await importKml(url);
      setMapUrl(url);
      setEmbedUrl(data.embed_url || "");
      setPoints(data.points || []);
      setResult(null);
      toast.success(`Importados ${data.points?.length || 0} puntos del mapa`);
    } catch (e) {
      const msg = e.response?.data?.detail || "Error al importar el mapa";
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  const handleOptimize = async () => {
    if (!points.length) {
      toast.error("Importa primero un mapa con puntos");
      return;
    }
    setLoading(true);
    try {
      const data = await optimizeRoute({
        points,
        categories,
        total_hours: Number(settings.total_hours),
        speed_kmh: Number(settings.speed_kmh),
        start_lat: settings.start_lat,
        start_lng: settings.start_lng,
        return_to_start: !!settings.return_to_start,
      });
      setResult(data);
      toast.success(`Ruta generada con ${data.stops.length} paradas`);
    } catch (e) {
      const msg = e.response?.data?.detail || "Error al optimizar";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (name) => {
    if (!result) {
      toast.error("Genera primero una ruta para guardarla");
      return;
    }
    try {
      await saveItinerary({
        name,
        map_url: mapUrl,
        embed_url: embedUrl,
        points,
        categories,
        settings,
        result,
      });
      toast.success("Itinerario guardado");
      refreshSaved();
    } catch (e) {
      toast.error("No se pudo guardar");
    }
  };

  const handleLoad = async (id) => {
    try {
      const it = await getItinerary(id);
      setMapUrl(it.map_url || "");
      setEmbedUrl(it.embed_url || "");
      setPoints(it.points || []);
      setCategories(it.categories || []);
      setSettings(it.settings || settings);
      setResult(it.result || null);
      toast.success(`Cargado: ${it.name}`);
    } catch (e) {
      toast.error("No se pudo cargar el itinerario");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteItinerary(id);
      toast.success("Itinerario eliminado");
      refreshSaved();
    } catch (e) {
      toast.error("No se pudo eliminar");
    }
  };

  const totalWeight = useMemo(() => result?.total_weight ?? 0, [result]);

  return (
    <div className="h-screen w-full flex flex-col bg-stone-50" data-testid="planner-root">
      {/* Top header bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-600 text-white flex items-center justify-center">
            <Compass size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-stone-900 leading-none">Rutas Eficientes</h1>
            <p className="text-xs text-stone-500 mt-1 tracking-wide">Planificador de recorridos · Google My Maps</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6 text-xs uppercase tracking-[0.2em] text-stone-500 font-semibold">
          <span data-testid="kpi-points-count">{points.length} puntos</span>
          <span data-testid="kpi-stops-count">{result?.stops?.length || 0} paradas</span>
          <span data-testid="kpi-total-weight">Valor {totalWeight}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <LeftPanel
          mapUrl={mapUrl}
          setMapUrl={setMapUrl}
          onImport={handleImport}
          importing={importing}
          categories={categories}
          setCategories={setCategories}
          settings={settings}
          setSettings={setSettings}
          points={points}
          setPoints={setPoints}
          onOptimize={handleOptimize}
          loading={loading}
          savedList={savedList}
          onLoad={handleLoad}
          onDelete={handleDelete}
          onSave={handleSave}
          hasResult={!!result}
        />
        <MapPanel
          embedUrl={embedUrl}
          points={points}
          result={result}
          settings={settings}
          categories={categories}
        />
        <ItineraryPanel
          result={result}
          categories={categories}
          settings={settings}
        />
      </div>
    </div>
  );
}
