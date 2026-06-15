import { useState } from "react";
import { Sparkles, Save, FolderOpen, Trash2, Settings2, MapPin, Clock, Footprints, ListChecks } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export default function LeftPanel({
  categories,
  toggleCategorySelected,
  updateCategoryDuration,
  settings, setSettings,
  points, setPoints,
  onOptimize, loading,
  savedList, onLoad, onDelete, onSave, hasResult,
}) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const removePoint = (id) => {
    setPoints((ps) => ps.filter((p) => p.id !== id));
  };

  const visibleCats = categories.filter((c) => c.id !== "otros");
  const unselectedCount = visibleCats.filter((c) => !c.selected).length;

  return (
    <aside
      className="w-full md:w-[300px] lg:w-[320px] shrink-0 h-full flex flex-col border-r border-stone-200 bg-white min-h-0"
      data-testid="left-panel"
    >
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-5 flex flex-col gap-5">
          {/* SETTINGS */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Settings2 size={14} className="text-orange-600" />
              <Label className="uppercase text-[11px] font-semibold tracking-[0.2em] text-stone-500">
                Configuración del día
              </Label>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-2 text-stone-700">
                  <Clock size={14} /> Tiempo disponible
                </Label>
                <span className="font-display font-semibold text-stone-900 text-sm" data-testid="setting-hours-value">
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

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-2 text-stone-700">
                  <Footprints size={14} /> Velocidad media
                </Label>
                <span className="font-display font-semibold text-stone-900 text-sm" data-testid="setting-speed-value">
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
              <div className="flex gap-1.5 mt-1 flex-wrap">
                <Badge
                  variant="outline"
                  onClick={() => setSettings({ ...settings, speed_kmh: 5 })}
                  className="cursor-pointer hover:bg-stone-50 text-[10px]"
                  data-testid="speed-preset-walk"
                >🚶 A pie 5</Badge>
                <Badge
                  variant="outline"
                  onClick={() => setSettings({ ...settings, speed_kmh: 15 })}
                  className="cursor-pointer hover:bg-stone-50 text-[10px]"
                  data-testid="speed-preset-bike"
                >🚲 Bici 15</Badge>
                <Badge
                  variant="outline"
                  onClick={() => setSettings({ ...settings, speed_kmh: 30 })}
                  className="cursor-pointer hover:bg-stone-50 text-[10px]"
                  data-testid="speed-preset-car"
                >🚗 Auto 30</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between bg-stone-50 rounded-lg p-2.5 border border-stone-200">
              <div>
                <Label className="text-sm text-stone-800">Volver al inicio</Label>
                <p className="text-[11px] text-stone-500">Cierra el bucle al punto de partida</p>
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-10"
            >
              <Sparkles size={16} className="mr-2" />
              {loading ? "Calculando…" : "Generar ruta óptima"}
            </Button>
          </section>

          <div className="h-px bg-stone-200" />

          {/* CATEGORIES */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ListChecks size={14} className="text-orange-600" />
              <Label className="uppercase text-[11px] font-semibold tracking-[0.2em] text-stone-500">
                ¿Qué te interesa?
              </Label>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Marcá lo que te interese. Las categorías marcadas reciben{" "}
              <strong>+5 por cada categoría desmarcada</strong>. Si dejás todas marcadas, no hay
              preferencia y se prioriza recorrer la mayor cantidad de paradas.
            </p>

            <div className="flex flex-col gap-1.5" data-testid="categories-editor">
              {visibleCats.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-lg border p-2.5 transition ${
                    c.selected ? "border-stone-200 bg-white" : "border-stone-200 bg-stone-50/60 opacity-80"
                  }`}
                  data-testid={`category-row-${c.id}`}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      data-testid={`category-checkbox-${c.id}`}
                      checked={c.selected}
                      onCheckedChange={() => toggleCategorySelected(c.id)}
                      className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600 border-stone-400"
                    />
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                    <span className="font-display font-semibold text-stone-900 text-[13px] flex-1 truncate">
                      {c.name}
                    </span>
                    <Badge
                      variant={c.selected && c.weight > 0 ? "default" : "outline"}
                      className={
                        c.selected && c.weight > 0
                          ? "bg-orange-600 hover:bg-orange-600 rounded-full text-[10px] px-1.5 py-0"
                          : "rounded-full text-[10px] px-1.5 py-0 border-stone-300 text-stone-500"
                      }
                      data-testid={`category-weight-${c.id}`}
                    >
                      {c.weight}
                    </Badge>
                    <div className="flex items-center gap-0.5">
                      <Input
                        data-testid={`category-duration-input-${c.id}`}
                        type="number"
                        value={c.duration_min}
                        onChange={(e) => updateCategoryDuration(c.id, Number(e.target.value) || 0)}
                        className="h-7 w-12 text-[11px] rounded-md text-right px-1.5"
                      />
                      <span className="text-[10px] text-stone-500">min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {unselectedCount === 0 && (
              <p className="text-[11px] text-stone-500 italic">
                Sin preferencias activas — el algoritmo busca encajar el mayor número de paradas.
              </p>
            )}
          </section>

          {/* POINTS LIST */}
          {points.length > 0 && (
            <>
              <div className="h-px bg-stone-200" />
              <section className="flex flex-col gap-2">
                <Label className="uppercase text-[11px] font-semibold tracking-[0.2em] text-stone-500">
                  Puntos importados ({points.length})
                </Label>
                <Accordion type="single" collapsible>
                  <AccordionItem value="points" className="border-none">
                    <AccordionTrigger data-testid="points-list-toggle" className="text-sm py-2">
                      Ver / editar puntos
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="h-[260px] pr-2">
                        <div className="flex flex-col gap-1.5">
                          {points.map((p) => (
                            <div
                              key={p.id}
                              data-testid={`point-row-${p.id}`}
                              className="border border-stone-200 rounded-lg p-2 bg-white"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-[12px] text-stone-900 truncate">{p.name}</div>
                                  <div className="text-[10px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                                    <MapPin size={9} />
                                    {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                                  </div>
                                  <div className="text-[9px] uppercase tracking-wider text-stone-400 mt-0.5">
                                    {categories.find((c) => c.id === p.category_id)?.name || p.category_id}
                                  </div>
                                </div>
                                <button
                                  data-testid={`remove-point-${p.id}`}
                                  onClick={() => removePoint(p.id)}
                                  className="text-stone-400 hover:text-red-600"
                                  aria-label="Quitar"
                                >
                                  <Trash2 size={13} />
                                </button>
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
          <section className="flex gap-2 pb-2">
            <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
              <DialogTrigger asChild>
                <Button
                  data-testid="open-save-dialog-button"
                  variant="outline"
                  disabled={!hasResult}
                  size="sm"
                  className="flex-1 rounded-lg border-stone-300 text-xs"
                >
                  <Save size={13} className="mr-1.5" /> Guardar
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
                  size="sm"
                  className="flex-1 rounded-lg border-stone-300 text-xs"
                >
                  <FolderOpen size={13} className="mr-1.5" /> Cargar
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
      </div>
    </aside>
  );
}
