import { MapPin, Route, TrendingUp, Timer } from "lucide-react";

export default function MapPanel({ embedUrl, points, result, settings }) {
  const formatMin = (m) => {
    const h = Math.floor(m / 60);
    const min = Math.round(m % 60);
    if (h <= 0) return `${min} min`;
    return `${h}h ${min}m`;
  };

  return (
    <main className="flex-1 min-w-0 h-full flex flex-col bg-stone-50 relative" data-testid="map-panel">
      {/* Compact KPI strip */}
      <div className="flex items-stretch gap-2 px-3 py-2 border-b border-stone-200 bg-white shrink-0">
        <KpiPill
          label="Paradas"
          value={result?.stops?.length ?? 0}
          sub={`de ${points.length}`}
          icon={<MapPin size={12} />}
          testid="kpi-card-stops"
        />
        <KpiPill
          label="Valor"
          value={result?.total_weight ?? 0}
          sub="pesos"
          icon={<TrendingUp size={12} />}
          testid="kpi-card-weight"
        />
        <KpiPill
          label="Distancia"
          value={`${(result?.total_distance_km ?? 0).toFixed(2)} km`}
          sub={`a ${settings.speed_kmh} km/h`}
          icon={<Route size={12} />}
          testid="kpi-card-distance"
        />
        <KpiPill
          label="Duración"
          value={formatMin(result?.total_time_min ?? 0)}
          sub={`de ${settings.total_hours}h`}
          icon={<Timer size={12} />}
          testid="kpi-card-duration"
        />
      </div>

      <div className="flex-1 relative overflow-hidden min-h-0">
        <iframe
          key={embedUrl}
          data-testid="mymaps-iframe"
          src={embedUrl}
          title="Google My Maps"
          className="w-full h-full border-0"
          loading="eager"
        />
      </div>

      {result && result.skipped.length > 0 && (
        <div
          className="px-4 py-1.5 bg-amber-50 border-t border-amber-200 text-[11px] text-amber-900 shrink-0"
          data-testid="skipped-banner"
        >
          <strong>{result.skipped.length}</strong>{" "}
          {result.skipped.length === 1 ? "parada omitida" : "paradas omitidas"} por falta de
          tiempo. Aumentá las horas o subí el peso de sus categorías.
        </div>
      )}
    </main>
  );
}

function KpiPill({ label, value, sub, icon, testid }) {
  return (
    <div
      className="flex-1 min-w-0 rounded-lg border border-stone-200 bg-white px-3 py-1.5 shadow-sm flex items-center gap-2"
      data-testid={testid}
    >
      <div className="text-stone-500">{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className="uppercase text-[9px] font-semibold tracking-[0.18em] text-stone-500 leading-none">
          {label}
        </span>
        <span className="font-display text-sm font-bold text-stone-900 leading-tight truncate">
          {value}
        </span>
      </div>
      <span className="ml-auto text-[10px] text-stone-400 whitespace-nowrap">{sub}</span>
    </div>
  );
}
