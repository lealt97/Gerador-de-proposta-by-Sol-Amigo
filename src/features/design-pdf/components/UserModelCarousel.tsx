import { ChevronLeft, ChevronRight, Copy, Edit2, MoreVertical, Star, Trash } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { PdfUserModel } from '../types/pdfDesignTypes';
import { PdfPreview } from './PdfPreview';

interface UserModelCarouselProps {
  userModels: PdfUserModel[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onEdit: (model: PdfUserModel) => void;
  onDuplicate: (modelId: string) => void;
  onDelete: (modelId: string) => void;
  onSetDefault: (modelId: string) => void;
}

export function UserModelCarousel({
  userModels,
  activeIndex,
  onActiveIndexChange,
  onEdit,
  onDuplicate,
  onDelete,
  onSetDefault,
}: UserModelCarouselProps) {
  const handlePrev = () => onActiveIndexChange(activeIndex === 0 ? userModels.length - 1 : activeIndex - 1);
  const handleNext = () => onActiveIndexChange(activeIndex === userModels.length - 1 ? 0 : activeIndex + 1);

  if (userModels.length === 0) {
    return (
      <div className="text-center p-12 bg-brand-surface border border-brand-border rounded-xl">
        <Star className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-brand-dark">Nenhum modelo adicionado</h3>
        <p className="text-slate-500 mt-2">Adicione um modelo padrão acima para começar a editar.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[620px] mx-auto py-4 px-0">
      <div className="relative h-[560px] select-none flex items-center justify-center">
        {userModels.length > 1 && (
          <>
            <button onClick={handlePrev} className="absolute left-0 top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-full bg-slate-900/80 border border-brand-border text-white hover:bg-brand-primary hover:border-brand-primary transition-all shadow-lg hover:scale-110 active:scale-95 focus:outline-none" aria-label="Anterior">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={handleNext} className="absolute right-0 top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-full bg-slate-900/80 border border-brand-border text-white hover:bg-brand-primary hover:border-brand-primary transition-all shadow-lg hover:scale-110 active:scale-95 focus:outline-none" aria-label="Próximo">
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        <div className="relative w-full h-full flex items-center justify-center overflow-visible">
          {userModels.map((model, index) => {
            const length = userModels.length || 1;
            let diff = index - activeIndex;
            if (diff < -length / 2) diff += length;
            if (diff > length / 2) diff -= length;
            if (Math.abs(diff) > 2) return null;

            const isActive = index === activeIndex;
            let transformStyle = '';
            let opacityStyle = '';
            let zIndexStyle = 10;

            if (diff === 0) {
              transformStyle = 'translate-x-[-50%] scale-[1.05]';
              opacityStyle = 'opacity-100';
              zIndexStyle = 30;
            } else if (diff === -1) {
              transformStyle = 'translate-x-[-135%] scale-[0.85]';
              opacityStyle = 'opacity-60';
              zIndexStyle = 20;
            } else if (diff === 1) {
              transformStyle = 'translate-x-[35%] scale-[0.85]';
              opacityStyle = 'opacity-60';
              zIndexStyle = 20;
            } else if (diff === -2) {
              transformStyle = 'translate-x-[-210%] scale-[0.7] opacity-0 pointer-events-none';
              opacityStyle = 'opacity-0';
            } else if (diff === 2) {
              transformStyle = 'translate-x-[110%] scale-[0.7] opacity-0 pointer-events-none';
              opacityStyle = 'opacity-0';
            }

            return (
              <div key={model.id} onClick={() => !isActive && onActiveIndexChange(index)} style={{ zIndex: zIndexStyle }} className={`absolute left-1/2 top-1/2 -translate-y-1/2 w-[260px] group bg-brand-surface border rounded-xl overflow-hidden shadow-md transition-all duration-500 ease-out cursor-pointer select-none ${transformStyle} ${opacityStyle} ${isActive ? 'border-brand-primary shadow-xl ring-2 ring-brand-primary/20' : 'border-brand-border'}`}>
                <div className="aspect-[1/1.414] bg-slate-950/40 relative">
                  <PdfPreview model={model} isCardPreview />
                  {model.is_default && (
                    <div className="absolute top-3 left-3 bg-brand-primary text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                      <Star className="w-3 h-3 fill-current" /> Padrão
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button onClick={(event) => { event.stopPropagation(); onEdit(model); }} className="px-3 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary/90 transition-colors flex items-center gap-2">
                        <Edit2 className="w-4 h-4" /> Editar
                      </button>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button onClick={(event) => event.stopPropagation()} className="p-2 rounded-lg bg-slate-950/80 text-white hover:bg-slate-800 transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content className="z-50 min-w-[180px] rounded-lg border border-brand-border bg-brand-surface p-1 shadow-xl text-sm text-slate-100">
                            <DropdownMenu.Item onClick={() => onDuplicate(model.id)} className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-white/10 outline-none">
                              <Copy className="w-4 h-4" /> Duplicar
                            </DropdownMenu.Item>
                            {!model.is_default && (
                              <DropdownMenu.Item onClick={() => onSetDefault(model.id)} className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-white/10 outline-none">
                                <Star className="w-4 h-4" /> Definir padrão
                              </DropdownMenu.Item>
                            )}
                            <DropdownMenu.Item onClick={() => onDelete(model.id)} className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-red-300 hover:bg-red-500/10 outline-none">
                              <Trash className="w-4 h-4" /> Excluir
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-brand-border bg-gray-50/20">
                  <h3 className={`font-semibold transition-colors duration-300 truncate text-sm text-center ${isActive ? 'text-white' : 'text-slate-400'}`}>{model.name}</h3>
                  <div className="flex gap-2 mt-3 justify-center">
                    <div className="w-5 h-5 rounded-full border border-brand-border" style={{ backgroundColor: model.theme.primary }} title="Primária" />
                    <div className="w-5 h-5 rounded-full border border-brand-border" style={{ backgroundColor: model.theme.secondary }} title="Secundária" />
                    <div className="w-5 h-5 rounded-full border border-brand-border" style={{ backgroundColor: model.theme.accent }} title="Destaque" />
                    <div className="w-5 h-5 rounded-full border border-brand-border" style={{ backgroundColor: model.theme.neutral }} title="Neutra" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-2">
        {userModels.map((_, index) => (
          <button key={index} onClick={() => onActiveIndexChange(index)} className={`h-2 rounded-full transition-all duration-300 focus:outline-none ${index === activeIndex ? 'w-6 bg-brand-primary' : 'w-2 bg-slate-600 hover:bg-slate-400'}`} aria-label={`Ir para modelo ${index + 1}`} />
        ))}
      </div>
    </div>
  );
}
