import { useState } from "react";
import { Download, Sparkles, Save, FolderOpen, Trash2, Settings2, MapPin, Clock, Footprints } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export default function LeftPanel({
  mapUrl, setMapUrl, onImport, importing,
  categories, setCategories,
  settings, setSettings,
  points, setPoints,
  onOptimize, loading,
  savedList, onLoad, onDelete, onSave, hasResult,
}) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const updateCategory = (id, field, value) => {
    setCategories((cs) => cs.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const updatePoint = (id, field, value) => {
    setPoints((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removePoint = (id) => {
    setPoints((ps) => ps.filter((p) => p.id !== id));
  };

  return (
    <aside
      className="w-full md:w-[380px] lg:w-[420px] h-full overflow-y-auto border-r border-stone-200 bg-white flex flex-col scrollbar-thin"
      data-testid="left-panel"
    >
      <div className="p-6 flex flex-col gap-6">
        {/* IMPORT */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Download size={14} className="text-orange-600" />
            <Label className="uppercase text-xs font-semibold tracking-[0.2em] text-stone-500">
              Importar mapa
            </Label>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed">
            Pega la URL de un <strong>Google My Maps</strong> público. Extraeremos los marcadores en segundos.
          </p>
          <Input
            data-testid="map-url-input"
            value={mapUrl}
            onChange={(e) => setMapUrl(e.target.value)}
            placeholder="https://www.google.com/maps/d/viewer?mid=..."
            className="rounded-lg focus-visible:ring-orange-500"
          />
          <Button
            data-testid="import-map-button"
            onClick={() => onImport(mapUrl)}
            disabled={!mapUrl || importing}
            className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
          >
            {importing ? "Importando..." : "Importar puntos"}
          </Button>
        </section>

        <div className="h-px bg-stone-200" />

        {/* SETTINGS */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Settings2 size={14} className="text-orange-600" />
            <Label className="uppercase text-xs font-semibold tracking-[0.2em] text-stone-500">
              Configuración del día
            </Label>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2 text-stone-700">
                <Clock size={14} /> Tiempo disponible
              </Label>
              <span className="font-display font-semibold text-stone-900" data-testid="setting-hours-value">
                {settings.total_hours} h
              </span>
            </div>
            <Slider
              data-testid="hours-slider"
              value={[settings.total_hours]}
              min={1}
              max={16}
              step={0.5}
              onValueChange={(v) => setSettings({ ...settings, total_hours: v[0] })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2 text-stone-700">
                <Footprints size={14} /> Velocidad media
              </Label>
              <span className="font-display font-semibold text-stone-900" data-testid="setting-speed-value">
                {settings.speed_kmh} km/h
              </span>
            </div>
            <Slider
              data-testid="speed-slider"
              value={[settings.speed_kmh]}
              min={2}
              max={60}
              step={1}
              onValueChange={(v) => setSettings({ ...settings, speed_kmh: v[0] })}
            />
            <div className="flex gap-2 mt-1">
              <Badge
                variant="outline"
                onClick={() => setSettings({ ...settings, speed_kmh: 5 })}
                className="cursor-pointer hover:bg-stone-50"
                data-testid="speed-preset-walk"
              >🚶 A pie 5</Badge>
              <Badge
                variant="outline"
                onClick={() => setSettings({ ...settings, speed_kmh: 15 })}
                className="cursor-pointer hover:bg-stone-50"
                data-testid="speed-preset-bike"
              >🚲 Bici 15</Badge>
              <Badge
                variant="outline"
                onClick={() => setSettings({ ...settings, speed_kmh: 30 })}
                className="cursor-pointer hover:bg-stone-50"
                data-testid="speed-preset-car"
              >🚗 Coche 30</Badge>
            </div>
          </div>

          <div className="flex items-center justify-between bg-stone-50 rounded-lg p-3 border border-stone-200">
            <div>
              <Label className="text-sm text-stone-800">Volver al inicio</Label>
              <p className="text-xs text-stone-500">Cierra el bucle al punto de partida</p>
            </div>
            <Switch
              data-testid="return-start-switch"
              checked={settings.return_to_start}
              onCheckedChange={(v) => setSettings({ ...settings, return_to_start: v })}
            />
          </div>

          <Button
            data-testid="generate-route-button"
            onClick={onOptimize}
            disabled={loading || !points.length}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-11"
          >
            <Sparkles size={16} className="mr-2" />
            {loading ? "Calculando..." : "Generar ruta óptima"}
          </Button>
        </section>

        <div className="h-px bg-stone-200" />

        {/* CATEGORIES */}
        <section className="flex flex-col gap-3">
          <Label className="uppercase text-xs font-semibold tracking-[0.2em] text-stone-500">
            Pesos por categoría
          </Label>
          <p className="text-xs text-stone-500">A mayor peso, mayor prioridad en la ruta.</p>
          <div className="flex flex-col gap-3" data-testid="categories-editor">
            {categories.map((c) => (
              <div key={c.id} className="rounded-lg border border-stone-200 p-3 bg-white" data-testid={`category-row-${c.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                    <span className="font-display font-semibold text-stone-900 text-sm">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span data-testid={`category-weight-${c.id}`}>Peso {c.weight}</span>
                    <span>·</span>
                    <span>{c.duration_min} min</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-stone-500">Peso</Label>
                    <Slider
                      data-testid={`category-weight-slider-${c.id}`}
                      value={[c.weight]}
                      min={0}
                      max={10}
                      step={0.5}
                      onValueChange={(v) => updateCategory(c.id, "weight", v[0])}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-stone-500">Duración (min)</Label>
                    <Input
                      data-testid={`category-duration-input-${c.id}`}
                      type="number"
                      value={c.duration_min}
                      onChange={(e) => updateCategory(c.id, "duration_min", Number(e.target.value) || 0)}
                      className="h-8 text-sm rounded-md"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* POINTS LIST */}
        {points.length > 0 && (
          <>
            <div className="h-px bg-stone-200" />
            <section className="flex flex-col gap-3">
              <Label className="uppercase text-xs font-semibold tracking-[0.2em] text-stone-500">
                Puntos importados ({points.length})
              </Label>
              <Accordion type="single" collapsible>
                <AccordionItem value="points">
                  <AccordionTrigger data-testid="points-list-toggle" className="text-sm">
                    Ver / editar puntos
                  </AccordionTrigger>
                  <AccordionContent>
                    <ScrollArea className="h-[280px] pr-2">
                      <div className="flex flex-col gap-2">
                        {points.map((p) => (
                          <div
                            key={p.id}
                            data-testid={`point-row-${p.id}`}
                            className="border border-stone-200 rounded-lg p-3 bg-white"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm text-stone-900 truncate">{p.name}</div>
                                <div className="text-xs text-stone-500 truncate flex items-center gap-1 mt-0.5">
                                  <MapPin size={10} />
                                  {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                                </div>
                              </div>
                              <button
                                data-testid={`remove-point-${p.id}`}
                                onClick={() => removePoint(p.id)}
                                className="text-stone-400 hover:text-red-600"
                                aria-label="Quitar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="mt-2">
                              <Select
                                value={p.category_id}
                                onValueChange={(v) => updatePoint(p.id, "category_id", v)}
                              >
                                <SelectTrigger
                                  data-testid={`point-category-select-${p.id}`}
                                  className="h-8 text-xs rounded-md"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((c) => (
                                    <SelectItem key={c.id} value={c.id} className="text-sm">
                                      <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                                        {c.name}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>
          </>
        )}

        <div className="h-px bg-stone-200" />

        {/* SAVE / LOAD */}
        <section className="flex gap-2">
          <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="open-save-dialog-button"
                variant="outline"
                disabled={!hasResult}
                className="flex-1 rounded-lg border-stone-300"
              >
                <Save size={14} className="mr-2" /> Guardar
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-xl">
              <DialogHeader>
                <DialogTitle className="font-display">Guardar itinerario</DialogTitle>
              </DialogHeader>
              <Input
                data-testid="save-itinerary-name-input"
                placeholder="Nombre del itinerario"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="rounded-lg"
              />
              <DialogFooter>
                <Button
                  data-testid="confirm-save-button"
                  onClick={async () => {
                    if (!saveName.trim()) return;
                    await onSave(saveName.trim());
                    setSaveName("");
                    setSaveOpen(false);
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="open-load-dialog-button"
                variant="outline"
                className="flex-1 rounded-lg border-stone-300"
              >
                <FolderOpen size={14} className="mr-2" /> Cargar
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-xl max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">Itinerarios guardados</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[300px] pr-2">
                {savedList.length === 0 ? (
                  <p className="text-sm text-stone-500 p-3">Aún no has guardado ningún itinerario.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {savedList.map((it) => (
                      <div
                        key={it.id}
                        data-testid={`saved-item-${it.id}`}
                        className="border border-stone-200 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-sm">{it.name}</div>
                          <div className="text-xs text-stone-500">
                            {it.result?.stops?.length || 0} paradas · valor {it.result?.total_weight || 0}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid={`load-button-${it.id}`}
                            onClick={async () => {
                              await onLoad(it.id);
                              setLoadOpen(false);
                            }}
                          >
                            Abrir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            data-testid={`delete-button-${it.id}`}
                            onClick={() => onDelete(it.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </section>
      </div>
    </aside>
  );
}
