import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { pdfModelService } from '../../services/pdfModelService';
import { PdfTemplatePreset, PdfUserModel } from '../../types/pdfModels';
import { DesignPdfEditor } from './DesignPdfEditor';
import { Button } from '../../components/ui/Button';
import { LayoutTemplate, Plus, MoreVertical, Edit2, Copy, Trash, Star } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export function DesignPdf() {
  const { user } = useAuth();
  
  const [presets, setPresets] = useState<PdfTemplatePreset[]>([]);
  const [userModels, setUserModels] = useState<PdfUserModel[]>([]);
  const [editingModel, setEditingModel] = useState<PdfUserModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        
        <div className="flex overflow-x-auto pb-4 gap-6 snap-x">
          {presets.map(preset => (
            <div key={preset.id} className="min-w-[280px] group relative bg-white border border-brand-border rounded-xl overflow-hidden shadow-sm snap-start">
              <div className="aspect-[1/1.414] bg-gray-100 relative">
                {preset.thumbnail_url ? (
                  <img src={preset.thumbnail_url} alt={preset.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">Sem miniatura</div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button onClick={() => handleAddFromPreset(preset.id)} className="gap-2">
                    <Plus className="w-4 h-4" /> Adicionar Modelo
                  </Button>
                </div>
              </div>
              <div className="p-4 border-t border-brand-border">
                <h3 className="font-semibold text-brand-dark">{preset.name}</h3>
                <div className="flex gap-2 mt-3">
                  <div className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: preset.default_theme.primary }} title="Primária" />
                  <div className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: preset.default_theme.secondary }} title="Secundária" />
                  <div className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: preset.default_theme.accent }} title="Destaque" />
                  <div className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: preset.default_theme.neutral }} title="Neutra" />
                </div>
              </div>
            </div>
          ))}
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
          <div className="text-center p-12 bg-white border border-brand-border rounded-xl">
            <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-brand-dark">Nenhum modelo adicionado</h3>
            <p className="text-slate-500 mt-2">Adicione um modelo padrão acima para começar a editar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {userModels.map(model => {
              const preset = presets.find(p => p.id === model.preset_id);
              return (
                <div key={model.id} className="relative bg-white border border-brand-border rounded-xl overflow-hidden shadow-sm flex flex-col">
                  {model.is_default && (
                    <div className="absolute top-2 left-2 z-10 bg-brand-primary text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                      Padrão
                    </div>
                  )}
                  <div className="aspect-[1/1.414] bg-gray-100 relative border-b border-brand-border">
                    {preset?.thumbnail_url ? (
                      <img src={preset.thumbnail_url} alt={model.name} className="w-full h-full object-cover opacity-80" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">Sem preview</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                       <h3 className="font-semibold text-white truncate">{model.name}</h3>
                    </div>
                  </div>
                  <div className="p-3 flex justify-between items-center bg-gray-50">
                    <div className="flex gap-1.5">
                      <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: model.theme.primary }} />
                      <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: model.theme.secondary }} />
                      <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: model.theme.accent }} />
                      <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: model.theme.neutral }} />
                    </div>
                    
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4 text-slate-600" />
                        </Button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content className="min-w-[160px] bg-white rounded-md shadow-lg p-1 border border-brand-border z-50">
                          <DropdownMenu.Item className="flex items-center gap-2 px-2 py-2 text-sm text-brand-dark hover:bg-gray-100 rounded-sm cursor-pointer outline-none" onClick={() => setEditingModel(model)}>
                            <Edit2 className="w-4 h-4" /> Editar
                          </DropdownMenu.Item>
                          <DropdownMenu.Item className="flex items-center gap-2 px-2 py-2 text-sm text-brand-dark hover:bg-gray-100 rounded-sm cursor-pointer outline-none" onClick={() => handleDuplicate(model.id)}>
                            <Copy className="w-4 h-4" /> Duplicar
                          </DropdownMenu.Item>
                          <DropdownMenu.Item className="flex items-center gap-2 px-2 py-2 text-sm text-brand-dark hover:bg-gray-100 rounded-sm cursor-pointer outline-none" onClick={() => handleSetDefault(model.id)}>
                            <Star className="w-4 h-4" /> Definir como Padrão
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator className="h-px bg-brand-border my-1" />
                          <DropdownMenu.Item className="flex items-center gap-2 px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-sm cursor-pointer outline-none" onClick={() => handleDelete(model.id)}>
                            <Trash className="w-4 h-4" /> Excluir
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
