import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { pdfModelService } from '../../services/pdfModelService';
import { PdfTemplatePreset, PdfUserModel } from '../../types/pdfModels';
import { DesignPdfEditor } from './DesignPdfEditor';
import { Button } from '../../components/ui/Button';
import { LayoutTemplate, Plus, MoreVertical, Edit2, Copy, Trash, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export function DesignPdf() {
  const { user } = useAuth();
  
  const [presets, setPresets] = useState<PdfTemplatePreset[]>([]);
  const [userModels, setUserModels] = useState<PdfUserModel[]>([]);
  const [editingModel, setEditingModel] = useState<PdfUserModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [userModelActiveIndex, setUserModelActiveIndex] = useState(0);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? presets.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === presets.length - 1 ? 0 : prev + 1));
  };

  const handleUserModelPrev = () => {
    setUserModelActiveIndex((prev) => (prev === 0 ? userModels.length - 1 : prev - 1));
  };

  const handleUserModelNext = () => {
    setUserModelActiveIndex((prev) => (prev === userModels.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    if (userModelActiveIndex >= userModels.length && userModels.length > 0) {
      setUserModelActiveIndex(userModels.length - 1);
    } else if (userModels.length === 0) {
      setUserModelActiveIndex(0);
    }
  }, [userModels.length, userModelActiveIndex]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setPresets(pdfModelService.getPresets());
      const models = await pdfModelService.getUserModels(user.id);
      setUserModels(models);
    } catch (e) {
      toast.error('Erro ao carregar modelos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFromPreset = async (presetId: string) => {
    if (!user) return;
    try {
      const newModel = await pdfModelService.createModelFromPreset(presetId, user.id);
      setUserModels([...userModels, newModel]);
      toast.success('Modelo adicionado com sucesso!');
      setEditingModel(newModel);
    } catch (e) {
      toast.error('Erro ao adicionar modelo');
    }
  };

  const handleDuplicate = async (modelId: string) => {
    if (!user) return;
    try {
      const newModel = await pdfModelService.duplicateModel(modelId, user.id);
      setUserModels([...userModels, newModel]);
      toast.success('Modelo duplicado com sucesso!');
    } catch (e) {
      toast.error('Erro ao duplicar modelo');
    }
  };

  const handleDelete = async (modelId: string) => {
    try {
      await pdfModelService.deleteModel(modelId);
      setUserModels(userModels.filter(m => m.id !== modelId));
      toast.success('Modelo excluído.');
    } catch (e) {
      toast.error('Erro ao excluir modelo');
    }
  };

  const handleSetDefault = async (modelId: string) => {
    try {
      await pdfModelService.setDefaultModel(modelId);
      loadData();
      toast.success('Modelo definido como padrão.');
    } catch (e) {
      toast.error('Erro ao definir padrão');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (editingModel) {
    return (
      <DesignPdfEditor 
        model={editingModel} 
        onClose={() => setEditingModel(null)} 
        onSave={() => {
          loadData();
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-brand-primary/10 rounded-lg">
            <LayoutTemplate className="w-6 h-6 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">Modelos Padrão</h1>
            <p className="text-slate-500">Escolha um modelo base para criar o seu design personalizado.</p>
          </div>
        </div>
        
        <div className="relative w-full max-w-[620px] mx-auto py-4 px-0">
          <div className="relative h-[460px] select-none flex items-center justify-center">
            {/* Botões de Navegação */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-full bg-slate-900/80 border border-brand-border text-white hover:bg-brand-primary hover:border-brand-primary transition-all shadow-lg hover:scale-110 active:scale-95 focus:outline-none"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-full bg-slate-900/80 border border-brand-border text-white hover:bg-brand-primary hover:border-brand-primary transition-all shadow-lg hover:scale-110 active:scale-95 focus:outline-none"
              aria-label="Próximo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Container dos Cards */}
            <div className="relative w-full h-full flex items-center justify-center overflow-visible">
              {presets.map((preset, index) => {
                const length = presets.length || 1;
                let diff = index - activeIndex;
                
                // Handle wrapping for circular loop
                if (diff < -length / 2) {
                  diff += length;
                } else if (diff > length / 2) {
                  diff -= length;
                }

                // If a card is too far away, we don't render it to optimize performance and prevent clashing
                const isVisible = Math.abs(diff) <= 2;
                if (!isVisible) return null;

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
                  zIndexStyle = 10;
                } else if (diff === 2) {
                  transformStyle = 'translate-x-[110%] scale-[0.7] opacity-0 pointer-events-none';
                  opacityStyle = 'opacity-0';
                  zIndexStyle = 10;
                }

                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      if (!isActive) setActiveIndex(index);
                    }}
                    style={{ zIndex: zIndexStyle }}
                    className={`absolute left-1/2 top-1/2 -translate-y-1/2 w-[240px] group bg-brand-surface border rounded-xl overflow-hidden shadow-md transition-all duration-500 ease-out cursor-pointer select-none
                      ${transformStyle} ${opacityStyle}
                      ${isActive ? 'border-brand-primary shadow-xl ring-2 ring-brand-primary/20' : 'border-brand-border'}
                    `}
                  >
                    <div className="aspect-[1/1.414] bg-slate-950/40 relative">
                      {preset.thumbnail_url ? (
                        <img src={preset.thumbnail_url} alt={preset.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">Sem miniatura</div>
                      )}
                      
                      {isActive && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddFromPreset(preset.id);
                            }} 
                            className="gap-2 font-semibold shadow-md"
                          >
                            <Plus className="w-4 h-4" /> Adicionar Modelo
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 border-t border-brand-border bg-gray-50/20">
                      <h3 className={`font-semibold transition-colors duration-300 truncate text-sm text-center ${isActive ? 'text-white' : 'text-slate-400'}`}>
                        {preset.name}
                      </h3>
                      <div className="flex gap-2 mt-3 justify-center">
                        <div className="w-5 h-5 rounded-full border border-brand-border" style={{ backgroundColor: preset.default_theme.primary }} title="Primária" />
                        <div className="w-5 h-5 rounded-full border border-brand-border" style={{ backgroundColor: preset.default_theme.secondary }} title="Secundária" />
                        <div className="w-5 h-5 rounded-full border border-brand-border" style={{ backgroundColor: preset.default_theme.accent }} title="Destaque" />
                        <div className="w-5 h-5 rounded-full border border-brand-border" style={{ backgroundColor: preset.default_theme.neutral }} title="Neutra" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dots de Navegação */}
          <div className="flex justify-center gap-2 mt-2">
            {presets.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 focus:outline-none ${
                  index === activeIndex 
                    ? 'w-6 bg-brand-primary' 
                    : 'w-2 bg-slate-600 hover:bg-slate-400'
                }`}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-brand-primary/10 rounded-lg">
            <Star className="w-6 h-6 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">Meus Modelos</h1>
            <p className="text-slate-500">Gerencie seus modelos de PDF personalizados.</p>
          </div>
        </div>

        {userModels.length === 0 ? (
          <div className="text-center p-12 bg-brand-surface border border-brand-border rounded-xl">
            <LayoutTemplate className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-brand-dark">Nenhum modelo adicionado</h3>
            <p className="text-slate-500 mt-2">Adicione um modelo padrão acima para começar a editar.</p>
          </div>
        ) : (
          <div className="relative w-full max-w-[620px] mx-auto py-4 px-0">
            <div className="relative h-[560px] select-none flex items-center justify-center">
              {/* Botões de Navegação */}
              {userModels.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUserModelPrev();
                    }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-full bg-slate-900/80 border border-brand-border text-white hover:bg-brand-primary hover:border-brand-primary transition-all shadow-lg hover:scale-110 active:scale-95 focus:outline-none"
                    aria-label="Anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUserModelNext();
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-full bg-slate-900/80 border border-brand-border text-white hover:bg-brand-primary hover:border-brand-primary transition-all shadow-lg hover:scale-110 active:scale-95 focus:outline-none"
                    aria-label="Próximo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Container dos Cards */}
              <div className="relative w-full h-full flex items-center justify-center overflow-visible">
                {userModels.map((model, index) => {
                  const preset = presets.find(p => p.id === model.preset_id);
                  const length = userModels.length || 1;
                  let diff = index - userModelActiveIndex;
                  
                  // Handle wrapping for circular loop
                  if (diff < -length / 2) {
                    diff += length;
                  } else if (diff > length / 2) {
                    diff -= length;
                  }

                  // If a card is too far away, we don't render it to optimize performance and prevent clashing
                  const isVisible = Math.abs(diff) <= 2;
                  if (!isVisible) return null;

                  const isActive = index === userModelActiveIndex;

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
                    zIndexStyle = 10;
                  } else if (diff === 2) {
                    transformStyle = 'translate-x-[110%] scale-[0.7] opacity-0 pointer-events-none';
                    opacityStyle = 'opacity-0';
                    zIndexStyle = 10;
                  }

                  return (
                    <div
                      key={model.id}
                      onClick={() => {
                        if (!isActive) setUserModelActiveIndex(index);
                      }}
                      style={{ zIndex: zIndexStyle }}
                      className={`absolute left-1/2 top-1/2 -translate-y-1/2 w-[240px] group bg-brand-surface border rounded-xl overflow-hidden shadow-md transition-all duration-500 ease-out cursor-pointer select-none
                        ${transformStyle} ${opacityStyle}
                        ${isActive ? 'border-brand-primary shadow-xl ring-2 ring-brand-primary/20' : 'border-brand-border'}
                      `}
                    >
                      {/* Transparent Overlay for inactive cards to handle click-to-focus safely */}
                      {!isActive && (
                        <div className="absolute inset-0 z-20 bg-transparent" />
                      )}

                      {model.is_default && (
                        <div className="absolute top-2 left-2 z-10 bg-amber-500 text-slate-950 text-xs font-black px-2 py-1 rounded shadow-md">
                          Padrão
                        </div>
                      )}
                      
                      <div className="aspect-[1/1.414] bg-slate-950/40 relative border-b border-brand-border">
                        {preset?.thumbnail_url ? (
                          <img src={preset.thumbnail_url} alt={model.name} className="w-full h-full object-cover opacity-80" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">Sem preview</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex items-end p-4">
                           <h3 className="font-semibold text-white truncate text-base drop-shadow-md w-full text-center">{model.name}</h3>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gray-50/20 flex flex-col gap-3 mt-auto">
                        {/* Color Palettes */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-300 font-medium">Cores</span>
                          <div className="flex gap-1">
                            <div className="w-4 h-4 rounded-full border border-brand-border" style={{ backgroundColor: model.theme.primary }} title="Primária" />
                            <div className="w-4 h-4 rounded-full border border-brand-border" style={{ backgroundColor: model.theme.secondary }} title="Secundária" />
                            <div className="w-4 h-4 rounded-full border border-brand-border" style={{ backgroundColor: model.theme.accent }} title="Destaque" />
                            <div className="w-4 h-4 rounded-full border border-brand-border" style={{ backgroundColor: model.theme.neutral }} title="Neutra" />
                          </div>
                        </div>

                        <div className="h-px bg-brand-border/60" />

                        {/* Highly visible, high contrast, directly accessible Action Buttons */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              size="sm" 
                              variant="default"
                              className="bg-brand-blue hover:bg-brand-blue-hover text-white font-bold flex items-center justify-center gap-1 text-xs py-2 shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingModel(model);
                              }}
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Editar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-brand-border bg-white/5 hover:bg-white/15 text-slate-100 hover:text-white font-semibold flex items-center justify-center gap-1 text-xs py-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicate(model.id);
                              }}
                            >
                              <Copy className="w-3.5 h-3.5" /> Duplicar
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {!model.is_default ? (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 font-semibold flex items-center justify-center gap-1 text-xs py-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetDefault(model.id);
                                }}
                              >
                                <Star className="w-3.5 h-3.5" /> Padrão
                              </Button>
                            ) : (
                              <div className="border border-amber-500/30 text-amber-300 bg-amber-500/20 rounded-md flex items-center justify-center gap-1 text-xs py-2 font-bold shadow-inner">
                                <Star className="w-3.5 h-3.5 fill-current text-amber-400 animate-pulse" /> Ativo
                              </div>
                            )}
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-1 text-xs py-2 shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(model.id);
                              }}
                            >
                              <Trash className="w-3.5 h-3.5" /> Excluir
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dots de Navegação */}
            {userModels.length > 1 && (
              <div className="flex justify-center gap-2 mt-2">
                {userModels.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setUserModelActiveIndex(index)}
                    className={`h-2 rounded-full transition-all duration-300 focus:outline-none ${
                      index === userModelActiveIndex 
                        ? 'w-6 bg-brand-primary' 
                        : 'w-2 bg-slate-600 hover:bg-slate-400'
                    }`}
                    aria-label={`Ir para slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
