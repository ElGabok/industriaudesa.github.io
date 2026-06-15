import { Clock, Footprints, ArrowDown, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

function formatTime(min, baseHour = 9) {
  // Treats min 0 = baseHour:00
  const total = baseHour * 60 + min;
  const h = Math.floor(total / 60) % 24;
  const m = Math.round(total % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDur(min) {
  if (min < 1) return "0 min";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h <= 0) return `${m} min`;
  return `${h}h ${m}m`;
}

export default function ItineraryPanel({ result, categories, settings }) {
  const cats = Object.fromEntries((categories || []).map((c) => [c.id, c]));

  return (
    <aside
      className="w-full md:w-[380px] lg:w-[420px] h-full overflow-y-auto border-l border-stone-200 bg-white scrollbar-thin"
      data-testid="itinerary-panel"
    >
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-stone-900">Tu itinerario</h2>
            <p className="text-xs text-stone-500 mt-1 uppercase tracking-[0.18em] font-semibold">
              Orden óptimo del día
            </p>
          </div>
          {result?.stops?.length > 0 && (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 rounded-full" data-testid="itinerary-stops-badge">
              {result.stops.length} paradas
            </Badge>
          )}
        </div>

        {!result || result.stops.length === 0 ? (
          <div className="mt-10 text-center text-sm text-stone-500" data-testid="itinerary-empty">
            <AlertCircle className="mx-auto mb-3 text-stone-400" size={28} />
            Aún no hay ruta generada. Importa tu mapa y pulsa <strong>Generar ruta óptima</strong>.
          </div>
        ) : (
          <ScrollArea className="mt-6 max-h-[calc(100vh-180px)]">
            <ol className="flex flex-col" data-testid="itinerary-list">
              {result.stops.map((s, idx) => {
                const cat = cats[s.point.category_id];
                const isLast = idx === result.stops.length - 1;
                return (
                  <li key={s.point.id} className="relative" data-testid={`itinerary-stop-${idx}`}>
                    {s.travel_min_from_prev > 0 && (
                      <div className="ml-1 mb-2 mt-2 flex items-center gap-2 text-xs text-stone-500" data-testid={`itinerary-travel-${idx}`}>
                        <ArrowDown size={12} />
                        <Footprints size={12} />
                        {formatDur(s.travel_min_from_prev)} · {s.distance_km_from_prev.toFixed(2)} km
                      </div>
                    )}
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="stop-number" style={cat ? { background: cat.color } : {}}>
                          {idx + 1}
                        </span>
                        {!isLast && <div className="timeline-connector mt-1" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-display font-semibold text-stone-900 leading-snug">
                            {s.point.name}
                          </div>
                          <div className="text-xs text-stone-500 whitespace-nowrap">
                            {formatTime(s.arrival_min)} – {formatTime(s.depart_min)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {cat && (
                            <Badge
                              variant="outline"
                              className="rounded-full text-[10px] uppercase tracking-wider border-stone-300"
                              style={{ color: cat.color, borderColor: cat.color }}
                            >
                              {cat.name}
                            </Badge>
                          )}
                          <span className="text-xs text-stone-500 inline-flex items-center gap-1">
                            <Clock size={11} />
                            {formatDur(s.depart_min - s.arrival_min)}
                          </span>
                          <span className="text-xs text-amber-700 inline-flex items-center gap-1">
                            ★ {s.weight}
                          </span>
                        </div>
                        {s.point.description && (
                          <p className="text-xs text-stone-500 mt-2 leading-relaxed line-clamp-2">
                            {s.point.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            {result.skipped.length > 0 && (
              <div className="mt-4 border-t border-stone-200 pt-4">
                <p className="text-xs uppercase tracking-[0.18em] font-semibold text-stone-500 mb-2">
                  No incluidos ({result.skipped.length})
                </p>
                <div className="flex flex-col gap-1.5">
                  {result.skipped.map((p) => {
                    const cat = cats[p.category_id];
                    return (
                      <div key={p.id} className="text-xs text-stone-600 flex items-center gap-2" data-testid={`skipped-${p.id}`}>
                        <span className="w-2 h-2 rounded-full" style={{ background: cat?.color || "#a8a29e" }} />
                        <span className="truncate">{p.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </ScrollArea>
        )}
      </div>
    </aside>
  );
}
