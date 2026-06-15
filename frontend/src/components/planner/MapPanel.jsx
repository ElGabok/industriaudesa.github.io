import { MapPin, Route, TrendingUp, Timer } from "lucide-react";

export default function MapPanel({ embedUrl, points, result, settings, categories }) {
  const hasMap = !!embedUrl;

  const formatMin = (m) => {
    const h = Math.floor(m / 60);
    const min = Math.round(m % 60);
    if (h <= 0) return `${min} min`;
    return `${h}h ${min}m`;
  };

  return (
    <main className="flex-1 h-full flex flex-col bg-stone-50 relative" data-testid="map-panel">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-stone-200 bg-white">
        <KpiCard
          label="Paradas"
          value={result?.stops?.length ?? 0}
          sub={`de ${points.length} disponibles`}
          icon={<MapPin size={14} />}
          testid="kpi-card-stops"
        />
        <KpiCard
          label="Valor total"
          value={result?.total_weight ?? 0}
          sub="suma de pesos"
          icon={<TrendingUp size={14} />}
          testid="kpi-card-weight"
        />
        <KpiCard
          label="Distancia"
          value={`${(result?.total_distance_km ?? 0).toFixed(2)} km`}
          sub={`a ${settings.speed_kmh} km/h`}
          icon={<Route size={14} />}
          testid="kpi-card-distance"
        />
        <KpiCard
          label="Duración"
          value={formatMin(result?.total_time_min ?? 0)}
          sub={`de ${settings.total_hours}h disponibles`}
          icon={<Timer size={14} />}
          testid="kpi-card-duration"
        />
      </div>

      <div className="flex-1 relative overflow-hidden">
        {hasMap ? (
          <iframe
            key={embedUrl}
            data-testid="mymaps-iframe"
            src={embedUrl}
            title="Google My Maps"
            className="w-full h-full border-0"
          />
        ) : (
          <EmptyState />
        )}
      </div>

      {result && result.skipped.length > 0 && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-900" data-testid="skipped-banner">
          <strong>{result.skipped.length}</strong> {result.skipped.length === 1 ? "parada omitida" : "paradas omitidas"} por falta de tiempo. Aumenta las horas o sube el peso de sus categorías.
        </div>
      )}
    </main>
  );
}

function KpiCard({ label, value, sub, icon, testid }) {
  return (
    <div
      className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
      data-testid={testid}
    >
      <div className="flex items-center gap-1 uppercase text-[10px] font-semibold tracking-[0.18em] text-stone-500">
        {icon}
        {label}
      </div>
      <div className="font-display text-2xl font-bold text-stone-900 mt-1 kpi-num">{value}</div>
      <div className="text-xs text-stone-500">{sub}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <img
        src="https://images.unsplash.com/photo-1532154078493-c1c3eef2023c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwxfHxtYXAlMjB0cmF2ZWwlMjByb3V0ZSUyMHZpbnRhZ2V8ZW58MHx8fHwxNzgxNTY0MzU0fDA&ixlib=rb-4.1.0&q=85"
        alt="Mapa antiguo"
        className="absolute inset-0 w-full h-full object-cover opacity-90"
      />
      <div className="absolute inset-0 vintage-overlay" />
      <div className="relative z-10 max-w-md text-center px-8 py-10 rounded-2xl bg-white/85 border border-stone-200 shadow-sm">
        <h2 className="font-display text-2xl font-bold text-stone-900">Empieza pegando un Google My Maps</h2>
        <p className="text-sm text-stone-600 mt-3 leading-relaxed">
          Comparte tu mapa como <em>público</em>, copia el enlace, pégalo en el panel izquierdo y
          generaremos la ruta más eficiente para tu día.
        </p>
        <div className="mt-5 text-xs text-stone-500 uppercase tracking-[0.2em] font-semibold">
          1. Importar · 2. Ajustar pesos · 3. Generar ruta
        </div>
      </div>
    </div>
  );
}
