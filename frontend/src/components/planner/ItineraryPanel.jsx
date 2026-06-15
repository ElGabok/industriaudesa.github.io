import { Clock, Footprints, ArrowDown, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function formatTime(min, baseHour = 9) {
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

export default function ItineraryPanel({ result, categories }) {
  const cats = Object.fromEntries((categories || []).map((c) => [c.id, c]));

  return (
    <aside
      className="w-full md:w-[320px] lg:w-[340px] shrink-0 h-full flex flex-col border-l border-stone-200 bg-white min-h-0"
      data-testid="itinerary-panel"
    >
      <div className="px-5 pt-5 pb-3 border-b border-stone-100 flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-display text-base font-bold text-stone-900">Tu itinerario</h2>
          <p className="text-[10px] text-stone-500 mt-0.5 uppercase tracking-[0.18em] font-semibold">
            Orden óptimo del día
          </p>
        </div>
        {result?.stops?.length > 0 && (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 rounded-full" data-testid="itinerary-stops-badge">
            {result.stops.length} paradas
          </Badge>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
        {!result || result.stops.length === 0 ? (
          <div className="mt-10 text-center text-sm text-stone-500" data-testid="itinerary-empty">
            <AlertCircle className="mx-auto mb-3 text-stone-400" size={28} />
            Aún no hay ruta generada. Ajustá tus preferencias y pulsá{" "}
            <strong>Generar ruta óptima</strong>.
          </div>
        ) : (
          <>
            <ol className="flex flex-col" data-testid="itinerary-list">
              {result.stops.map((s, idx) => {
                const cat = cats[s.point.category_id];
                const isLast = idx === result.stops.length - 1;
                return (
                  <li key={s.point.id} className="relative" data-testid={`itinerary-stop-${idx}`}>
                    {s.travel_min_from_prev > 0 && (
                      <div
                        className="ml-1 mb-1.5 mt-1.5 flex items-center gap-1.5 text-[11px] text-stone-500"
                        data-testid={`itinerary-travel-${idx}`}
                      >
                        <ArrowDown size={11} />
                        <Footprints size={11} />
                        {formatDur(s.travel_min_from_prev)} · {s.distance_km_from_prev.toFixed(2)} km
                      </div>
                    )}
                    <div className="flex gap-2.5">
                      <div className="flex flex-col items-center">
                        <span className="stop-number" style={cat ? { background: cat.color } : {}}>
                          {idx + 1}
                        </span>
                        {!isLast && <div className="timeline-connector mt-1" />}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-display font-semibold text-stone-900 text-[13px] leading-snug">
                            {s.point.name}
                          </div>
                          <div className="text-[10px] text-stone-500 whitespace-nowrap">
                            {formatTime(s.arrival_min)} – {formatTime(s.depart_min)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {cat && (
                            <Badge
                              variant="outline"
                              className="rounded-full text-[9px] uppercase tracking-wider border-stone-300 px-1.5 py-0"
                              style={{ color: cat.color, borderColor: cat.color }}
                            >
                              {cat.name}
                            </Badge>
                          )}
                          <span className="text-[10px] text-stone-500 inline-flex items-center gap-1">
                            <Clock size={10} />
                            {formatDur(s.depart_min - s.arrival_min)}
                          </span>
                          <span className="text-[10px] text-amber-700 inline-flex items-center gap-1">
                            ★ {s.weight}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            {result.skipped.length > 0 && (
              <div className="mt-3 border-t border-stone-200 pt-3">
                <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-stone-500 mb-1.5">
                  No incluidos ({result.skipped.length})
                </p>
                <div className="flex flex-col gap-1">
                  {result.skipped.map((p) => {
                    const cat = cats[p.category_id];
                    return (
                      <div
                        key={p.id}
                        className="text-[11px] text-stone-600 flex items-center gap-2"
                        data-testid={`skipped-${p.id}`}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cat?.color || "#a8a29e" }} />
                        <span className="truncate">{p.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
