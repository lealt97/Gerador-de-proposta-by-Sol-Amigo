import { PointerEvent, useMemo, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { RoofModuleSvg } from './RoofModuleSvg';
import {
  DEFAULT_ROOF_LAYOUT_STRINGS,
  EMPTY_ROOF_LAYOUT,
  RoofLayoutData,
  RoofLayoutModule,
  RoofLayoutString,
} from '../../types/roofLayout';

interface RoofLayoutEditorProps {
  value?: RoofLayoutData | null;
  onChange: (value: RoofLayoutData) => void;
  roofImageUrl?: string | null;
  moduleWidthM?: number;
  moduleHeightM?: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const round = (value: number) => Number(value.toFixed(2));

function normalizeLayout(value?: RoofLayoutData | null): RoofLayoutData {
  const strings = value?.strings?.length ? value.strings : DEFAULT_ROOF_LAYOUT_STRINGS;
  return {
    ...EMPTY_ROOF_LAYOUT,
    ...value,
    version: value?.version || 1,
    strings,
    modules: (value?.modules || []).map((module) => ({
      ...module,
      width: module.width || 6,
      height: module.height || 13,
      rotation: module.rotation || 0,
      skewX: module.skewX || 0,
      skewY: module.skewY || 0,
      stringId: module.stringId || strings[0]?.id || 'string-1',
    })),
  };
}

function countModulesByString(modules: RoofLayoutModule[], stringId: string) {
  return modules.filter((module) => module.stringId === stringId).length;
}

export function RoofLayoutEditor({
  value,
  onChange,
  roofImageUrl,
  moduleWidthM = 1.13,
  moduleHeightM = 2.28,
}: RoofLayoutEditorProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const layout = normalizeLayout(value);
  const [selectedStringId, setSelectedStringId] = useState(layout.strings[0]?.id || 'string-1');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(layout.modules[0]?.id || null);

  const selectedModule = useMemo(
    () => layout.modules.find((module) => module.id === selectedModuleId) || null,
    [layout.modules, selectedModuleId]
  );

  const moduleArea = moduleWidthM * moduleHeightM;
  const occupiedArea = layout.modules.length * moduleArea;

  const commitLayout = (nextLayout: RoofLayoutData) => {
    onChange({
      ...nextLayout,
      version: nextLayout.version || 1,
    });
  };

  const updateModules = (modules: RoofLayoutModule[]) => {
    commitLayout({ ...layout, modules });
  };

  const updateStrings = (strings: RoofLayoutString[]) => {
    commitLayout({ ...layout, strings });
  };

  const createModule = (index: number, x: number, y: number): RoofLayoutModule => ({
    id: `mod-${Date.now()}-${index}`,
    x: clamp(x, 0, 94),
    y: clamp(y, 0, 87),
    width: 6,
    height: 13,
    rotation: 0,
    skewX: 0,
    skewY: 0,
    stringId: selectedStringId,
  });

  const addModule = () => {
    const index = layout.modules.length;
    const nextModule = createModule(index, 5 + (index % 8) * 8, 8 + Math.floor(index / 8) * 15);

    updateModules([...layout.modules, nextModule]);
    setSelectedModuleId(nextModule.id);
  };

  const addModuleRow = () => {
    const startIndex = layout.modules.length;
    const row = Array.from({ length: 6 }).map((_, index) =>
      createModule(startIndex + index, 5 + index * 8, 8 + Math.floor(startIndex / 8) * 15)
    );

    updateModules([...layout.modules, ...row]);
    setSelectedModuleId(row[0]?.id || null);
  };

  const removeSelectedModule = () => {
    if (!selectedModuleId) return;
    updateModules(layout.modules.filter((module) => module.id !== selectedModuleId));
    setSelectedModuleId(null);
  };

  const duplicateSelectedModule = () => {
    if (!selectedModule) return;

    const duplicate: RoofLayoutModule = {
      ...selectedModule,
      id: `mod-${Date.now()}`,
      x: clamp(selectedModule.x + 2, 0, 100 - selectedModule.width),
      y: clamp(selectedModule.y + 2, 0, 100 - selectedModule.height),
    };

    updateModules([...layout.modules, duplicate]);
    setSelectedModuleId(duplicate.id);
  };

  const clearModules = () => {
    updateModules([]);
    setSelectedModuleId(null);
  };

  const addString = () => {
    const index = layout.strings.length + 1;
    const colors = ['#9333EA', '#EA580C', '#0891B2', '#4D7C0F'];
    const nextString = {
      id: `string-${Date.now()}`,
      name: `String ${index}`,
      color: colors[index % colors.length],
    };
    updateStrings([...layout.strings, nextString]);
    setSelectedStringId(nextString.id);
  };

  const updateSelectedModule = (patch: Partial<RoofLayoutModule>) => {
    if (!selectedModuleId) return;
    updateModules(
      layout.modules.map((module) =>
        module.id === selectedModuleId
          ? {
              ...module,
              ...patch,
            }
          : module
      )
    );
  };

  const resetSelectedPerspective = () => {
    updateSelectedModule({ rotation: 0, skewX: 0, skewY: 0 });
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, module: RoofLayoutModule) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const moduleLeft = rect.left + (module.x / 100) * rect.width;
    const moduleTop = rect.top + (module.y / 100) * rect.height;

    dragRef.current = {
      id: module.id,
      offsetX: event.clientX - moduleLeft,
      offsetY: event.clientY - moduleTop,
    };
    setSelectedModuleId(module.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const module = layout.modules.find((item) => item.id === drag.id);
    if (!module) return;

    const nextX = ((event.clientX - rect.left - drag.offsetX) / rect.width) * 100;
    const nextY = ((event.clientY - rect.top - drag.offsetY) / rect.height) * 100;

    updateModules(
      layout.modules.map((item) =>
        item.id === drag.id
          ? {
              ...item,
              x: clamp(round(nextX), 0, 100 - item.width),
              y: clamp(round(nextY), 0, 100 - item.height),
            }
          : item
      )
    );
  };

  const stopDragging = () => {
    dragRef.current = null;
  };

  const stringColor = (stringId: string) => layout.strings.find((string) => string.id === stringId)?.color || '#2563EB';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="space-y-1 sm:w-56">
          <label className="text-xs font-medium text-slate-500">String ativa</label>
          <Select value={selectedStringId} onChange={(event) => setSelectedStringId(event.target.value)}>
            {layout.strings.map((string) => (
              <option key={string.id} value={string.id}>
                {string.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={addModule}>Adicionar módulo</Button>
          <Button type="button" variant="outline" onClick={addModuleRow}>Adicionar linha com 6</Button>
          <Button type="button" variant="outline" onClick={addString}>Nova string</Button>
          <Button type="button" variant="ghost" onClick={clearModules}>Limpar layout</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerLeave={stopDragging}
          className="relative min-h-[420px] overflow-hidden rounded-xl border border-brand-border bg-slate-100"
          style={{
            backgroundImage: roofImageUrl ? `url(${roofImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {!roofImageUrl && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-500">
              Envie a foto do telhado ou informe uma URL para posicionar os módulos sobre a imagem.
            </div>
          )}

          <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {layout.strings.map((string) => {
              const modules = layout.modules.filter((module) => module.stringId === string.id);
              return modules.slice(1).map((module, index) => {
                const previous = modules[index];
                const x1 = previous.x + previous.width / 2;
                const y1 = previous.y + previous.height / 2;
                const x2 = module.x + module.width / 2;
                const y2 = module.y + module.height / 2;

                return (
                  <line
                    key={`${string.id}-${module.id}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={string.color}
                    strokeWidth="0.45"
                    strokeDasharray="1 0.8"
                  />
                );
              });
            })}
          </svg>

          {layout.modules.map((module, index) => {
            const color = stringColor(module.stringId);
            const isSelected = selectedModuleId === module.id;

            return (
              <button
                key={module.id}
                type="button"
                onPointerDown={(event) => handlePointerDown(event, module)}
                onClick={() => setSelectedModuleId(module.id)}
                className={`absolute cursor-move bg-transparent p-0 transition-shadow ${isSelected ? 'ring-2 ring-offset-2 ring-brand-blue' : ''}`}
                style={{
                  left: `${module.x}%`,
                  top: `${module.y}%`,
                  width: `${module.width}%`,
                  height: `${module.height}%`,
                  transform: `rotate(${module.rotation || 0}deg) skewX(${module.skewX || 0}deg) skewY(${module.skewY || 0}deg)`,
                  transformOrigin: 'center',
                }}
                title={`Módulo ${index + 1}`}
              >
                <RoofModuleSvg color={color} label={`${index + 1}`} className="h-full w-full drop-shadow-sm" />
              </button>
            );
          })}
        </div>

        <div className="space-y-4 rounded-xl border border-brand-border bg-white p-4">
          <div>
            <h3 className="text-sm font-semibold text-brand-dark">Resumo da planimetria</h3>
            <p className="text-xs text-slate-500 mt-1">
              {layout.modules.length} módulos posicionados • {occupiedArea.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m² ocupados
            </p>
          </div>

          <div className="space-y-2">
            {layout.strings.map((string) => (
              <div key={string.id} className="flex items-center gap-2 text-xs">
                <input
                  type="color"
                  value={string.color}
                  onChange={(event) =>
                    updateStrings(
                      layout.strings.map((item) =>
                        item.id === string.id ? { ...item, color: event.target.value } : item
                      )
                    )
                  }
                  className="h-8 w-10 rounded border border-brand-border bg-white"
                  aria-label={`Cor da ${string.name}`}
                />
                <input
                  value={string.name}
                  onChange={(event) =>
                    updateStrings(
                      layout.strings.map((item) =>
                        item.id === string.id ? { ...item, name: event.target.value } : item
                      )
                    )
                  }
                  className="min-w-0 flex-1 rounded border border-brand-border bg-gray-50 px-2 py-1 text-xs text-brand-dark"
                />
                <span className="text-slate-500">{countModulesByString(layout.modules, string.id)}</span>
              </div>
            ))}
          </div>

          {selectedModule ? (
            <div className="space-y-3 border-t border-brand-border pt-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-brand-dark">Módulo selecionado</h4>
                <Button type="button" variant="ghost" size="sm" onClick={resetSelectedPerspective}>
                  Resetar perspectiva
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-500">
                  X %
                  <input
                    type="number"
                    value={selectedModule.x}
                    onChange={(event) => updateSelectedModule({ x: clamp(Number(event.target.value), 0, 100 - selectedModule.width) })}
                    className="mt-1 w-full rounded border border-brand-border bg-gray-50 px-2 py-1 text-xs"
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Y %
                  <input
                    type="number"
                    value={selectedModule.y}
                    onChange={(event) => updateSelectedModule({ y: clamp(Number(event.target.value), 0, 100 - selectedModule.height) })}
                    className="mt-1 w-full rounded border border-brand-border bg-gray-50 px-2 py-1 text-xs"
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Largura %
                  <input
                    type="number"
                    min="2"
                    max="30"
                    step="0.5"
                    value={selectedModule.width}
                    onChange={(event) => updateSelectedModule({ width: clamp(Number(event.target.value), 2, 30) })}
                    className="mt-1 w-full rounded border border-brand-border bg-gray-50 px-2 py-1 text-xs"
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Altura %
                  <input
                    type="number"
                    min="4"
                    max="45"
                    step="0.5"
                    value={selectedModule.height}
                    onChange={(event) => updateSelectedModule({ height: clamp(Number(event.target.value), 4, 45) })}
                    className="mt-1 w-full rounded border border-brand-border bg-gray-50 px-2 py-1 text-xs"
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Rotação °
                  <input
                    type="number"
                    min="-180"
                    max="180"
                    value={selectedModule.rotation}
                    onChange={(event) => updateSelectedModule({ rotation: clamp(Number(event.target.value) || 0, -180, 180) })}
                    className="mt-1 w-full rounded border border-brand-border bg-gray-50 px-2 py-1 text-xs"
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Skew X °
                  <input
                    type="number"
                    min="-45"
                    max="45"
                    value={selectedModule.skewX || 0}
                    onChange={(event) => updateSelectedModule({ skewX: clamp(Number(event.target.value) || 0, -45, 45) })}
                    className="mt-1 w-full rounded border border-brand-border bg-gray-50 px-2 py-1 text-xs"
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Skew Y °
                  <input
                    type="number"
                    min="-45"
                    max="45"
                    value={selectedModule.skewY || 0}
                    onChange={(event) => updateSelectedModule({ skewY: clamp(Number(event.target.value) || 0, -45, 45) })}
                    className="mt-1 w-full rounded border border-brand-border bg-gray-50 px-2 py-1 text-xs"
                  />
                </label>
                <label className="text-xs text-slate-500">
                  String
                  <Select
                    value={selectedModule.stringId}
                    onChange={(event) => updateSelectedModule({ stringId: event.target.value })}
                    className="mt-1 h-8 text-xs"
                  >
                    {layout.strings.map((string) => (
                      <option key={string.id} value={string.id}>{string.name}</option>
                    ))}
                  </Select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateSelectedModule({
                    width: clamp(round(selectedModule.width * 0.9), 2, 30),
                    height: clamp(round(selectedModule.height * 0.9), 4, 45),
                  })}
                >
                  Diminuir
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateSelectedModule({
                    width: clamp(round(selectedModule.width * 1.1), 2, 30),
                    height: clamp(round(selectedModule.height * 1.1), 4, 45),
                  })}
                >
                  Aumentar
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={duplicateSelectedModule}>
                  Duplicar
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={removeSelectedModule}>
                  Excluir módulo
                </Button>
              </div>

              <p className="text-[11px] leading-relaxed text-slate-500">
                Use rotação, Skew X e Skew Y para encaixar o SVG na perspectiva do telhado. O preto do módulo permanece fixo; somente a parte colorida acompanha a cor da string.
              </p>
            </div>
          ) : (
            <p className="border-t border-brand-border pt-4 text-xs text-slate-500">
              Selecione um módulo para ajustar posição, tamanho, rotação, perspectiva e string.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
