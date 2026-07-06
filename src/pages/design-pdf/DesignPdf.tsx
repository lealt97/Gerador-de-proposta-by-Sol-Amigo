import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import {
  DEFAULT_IMAGE_TRANSFORM,
  DEFAULT_PAGE_CONFIG,
  DEFAULT_PDF_THEME,
  pdfDesignService,
} from '../../services/pdfDesignService';
import { PdfCoverTemplate, PdfImageTransform, PdfPageConfig, PdfTemplate, PdfTheme } from '../../types/pdfDesign';
import { SvgPreview } from './SvgPreview';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import {
  Copy,
  FileText,
  Image as ImageIcon,
  LayoutTemplate,
  MoveDown,
  MoveLeft,
  MoveRight,
  MoveUp,
  Palette,
  PenTool,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Settings2,
  Star,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

type EditorTab = 'cover' | 'colors' | 'logo' | 'image' | 'pages' | 'charts';

const FALLBACK_COVERS: PdfCoverTemplate[] = Array.from({ length: 10 }).map((_, index) => ({
  id: `fallback-${index + 1}`,
  name: `Modelo ${index + 1}`,
  slug: `modelo-${index + 1}`,
  svg_file_url: `/pdf-assets/covers/cover-model-${(index % 3) + 1}.svg`,
  thumbnail_url: null,
  default_theme: DEFAULT_PDF_THEME,
  color_map: {},
  default_page_config: DEFAULT_PAGE_CONFIG,
  sort_order: index + 1,
  is_active: true,
  created_at: new Date().toISOString(),
}));

const PAGE_LABELS: Record<string, string> = {
  cover: 'Capa',
  summary: 'Resumo',
  clientData: 'Dados do Cliente',
  technicalSystem: 'Sistema Fotovoltaico',
  financialAnalysis: 'Análise Financeira',
  paybackChart: 'Gráfico de Payback',
  equipment: 'Equipamentos',
  terms: 'Termos',
  signature: 'Assinatura',
};

const EDITOR_TABS: Array<{ id: EditorTab; label: string; icon: React.ElementType }> = [
  { id: 'cover', label: 'Capa', icon: LayoutTemplate },
  { id: 'colors', label: 'Cores', icon: Palette },
  { id: 'logo', label: 'Logo', icon: ImageIcon },
  { id: 'image', label: 'Imagem', icon: Upload },
  { id: 'pages', label: 'Páginas', icon: FileText },
  { id: 'charts', label: 'Gráficos', icon: Settings2 },
];

function getTheme(model: Partial<PdfTemplate> | null): PdfTheme {
  return {
    primary: model?.theme?.primary || model?.primary_color || DEFAULT_PDF_THEME.primary,
    secondary: model?.theme?.secondary || model?.secondary_color || DEFAULT_PDF_THEME.secondary,
    accent: model?.theme?.accent || model?.accent_color || DEFAULT_PDF_THEME.accent,
    neutral: model?.theme?.neutral || model?.neutral_color || DEFAULT_PDF_THEME.neutral,
  };
}

function getTransform(transform?: PdfImageTransform | null): PdfImageTransform {
  return {
    ...DEFAULT_IMAGE_TRANSFORM,
    ...(transform || {}),
  };
}

function getPageConfig(config?: PdfPageConfig | null): PdfPageConfig {
  return {
    pages: {
      ...DEFAULT_PAGE_CONFIG.pages,
      ...(config?.pages || {}),
    },
    order: config?.order?.length ? config.order : DEFAULT_PAGE_CONFIG.order,
  };
}

function paletteValues(theme?: PdfTheme | null) {
  const current = theme || DEFAULT_PDF_THEME;
  return [current.primary, current.secondary, current.accent, current.neutral];
}

function getPresetById(templates: PdfCoverTemplate[], id?: string | null) {
  if (!id) return null;
  return templates.find((template) => template.id === id) || null;
}

function ModelPalette({ theme }: { theme?: PdfTheme | null }) {
  return (
    <div className="flex items-center gap-1">
      {paletteValues(theme).map((color) => (
        <span
          key={color}
          className="h-4 w-4 rounded-full border border-white shadow-sm"
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
      <span className="h-4 w-4 rounded-full border border-slate-200 bg-white shadow-sm" title="Branco fixo" />
    </div>
  );
}

export function DesignPdf() {
  const { user } = useAuth();

  const [coverTemplates, setCoverTemplates] = useState<PdfCoverTemplate[]>([]);
  const [userModels, setUserModels] = useState<PdfTemplate[]>([]);
  const [activeModel, setActiveModel] = useState<PdfTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('cover');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const theme = useMemo(() => getTheme(activeModel), [activeModel]);
  const activeCover = useMemo(
    () => getPresetById(coverTemplates, activeModel?.cover_template_id) || coverTemplates[0] || null,
    [activeModel?.cover_template_id, coverTemplates]
  );
  const coverTransform = getTransform(activeModel?.cover_image_transform);
  const logoTransform = getTransform(activeModel?.logo_transform);
  const pageConfig = getPageConfig(activeModel?.page_config);

  async function loadData(selectModelId?: string) {
    if (!user) return;

    try {
      setIsLoading(true);
      const [coversFromDb, models] = await Promise.all([
        pdfDesignService.getCoverTemplates(),
        pdfDesignService.getUserTemplates(user.id),
      ]);

      const covers = coversFromDb.length ? coversFromDb : FALLBACK_COVERS;
      setCoverTemplates(covers);
      setUserModels(models);

      const selected =
        models.find((model) => model.id === selectModelId) ||
        models.find((model) => model.is_default) ||
        models[0] ||
        null;

      setActiveModel(selected);
    } catch (error: any) {
      console.error('Error loading PDF design data:', error);
      toast.error(error.message || 'Erro ao carregar modelos de PDF. Verifique o schema do Supabase.');
      setCoverTemplates(FALLBACK_COVERS);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user?.id]);

  function updateActiveModel(patch: Partial<PdfTemplate>) {
    setActiveModel((current) => {
      if (!current) return current;
      return {
        ...current,
        ...patch,
      };
    });
  }

  function updateTheme(key: keyof PdfTheme, value: string) {
    const nextTheme = {
      ...theme,
      [key]: value,
    };

    updateActiveModel({
      theme: nextTheme,
      primary_color: nextTheme.primary,
      secondary_color: nextTheme.secondary,
      accent_color: nextTheme.accent,
      neutral_color: nextTheme.neutral,
      background_color: '#FFFFFF',
    });
  }

  function updateCoverTransform(patch: Partial<PdfImageTransform>) {
    updateActiveModel({
      cover_image_transform: {
        ...coverTransform,
        ...patch,
      },
    });
  }

  function togglePage(pageKey: string) {
    updateActiveModel({
      page_config: {
        ...pageConfig,
        pages: {
          ...pageConfig.pages,
          [pageKey]: !pageConfig.pages[pageKey],
        },
      },
    });
  }

  async function handleAddPreset(preset: PdfCoverTemplate) {
    if (!user) return;

    if (preset.id.startsWith('fallback-')) {
      toast.error('Cadastre os 10 modelos padrão no Supabase para adicionar este modelo.');
      return;
    }

    try {
      const created = await pdfDesignService.addTemplateFromPreset(preset, user.id);
      setUserModels((models) => [created, ...models]);
      setActiveModel(created);
      setActiveTab('colors');
      toast.success('Modelo adicionado aos seus modelos.');
    } catch (error: any) {
      console.error('Error adding model:', error);
      toast.error(error.message || 'Erro ao adicionar modelo.');
    }
  }

  async function handleSave() {
    if (!activeModel || !user) return;

    setIsSaving(true);
    try {
      const saved = await pdfDesignService.saveTemplate({
        ...activeModel,
        user_id: user.id,
        theme,
        primary_color: theme.primary,
        secondary_color: theme.secondary,
        accent_color: theme.accent,
        neutral_color: theme.neutral,
        background_color: '#FFFFFF',
      });

      setActiveModel(saved);
      setUserModels((models) => models.map((model) => (model.id === saved.id ? saved : model)));
      toast.success('Modelo salvo com sucesso!');
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Erro ao salvar o modelo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRename(model: PdfTemplate) {
    const name = window.prompt('Novo nome do modelo:', model.name);
    if (!name || name.trim() === model.name) return;

    try {
      const renamed = await pdfDesignService.renameTemplate(model.id, name.trim());
      setUserModels((models) => models.map((item) => (item.id === renamed.id ? renamed : item)));
      if (activeModel?.id === renamed.id) setActiveModel(renamed);
      toast.success('Modelo renomeado.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao renomear modelo.');
    }
  }

  async function handleDuplicate(model: PdfTemplate) {
    if (!user) return;

    try {
      const duplicated = await pdfDesignService.duplicateTemplate(model, user.id);
      setUserModels((models) => [duplicated, ...models]);
      setActiveModel(duplicated);
      setActiveTab('colors');
      toast.success('Modelo duplicado com sucesso.');
    } catch (error: any) {
      console.error('Error duplicating model:', error);
      toast.error(error.message || 'Erro ao duplicar modelo.');
    }
  }

  async function handleDelete(model: PdfTemplate) {
    if (!window.confirm(`Excluir o modelo "${model.name}"?`)) return;

    try {
      await pdfDesignService.softDeleteTemplate(model.id);
      const nextModels = userModels.filter((item) => item.id !== model.id);
      setUserModels(nextModels);
      if (activeModel?.id === model.id) {
        setActiveModel(nextModels.find((item) => item.is_default) || nextModels[0] || null);
      }
      toast.success('Modelo excluído.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir modelo.');
    }
  }

  async function handleSetDefault(model: PdfTemplate) {
    if (!user) return;

    try {
      await pdfDesignService.setDefaultTemplate(model.id, user.id);
      const updated = userModels.map((item) => ({ ...item, is_default: item.id === model.id }));
      setUserModels(updated);
      setActiveModel((current) => (current ? { ...current, is_default: current.id === model.id } : current));
      toast.success('Modelo definido como padrão.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao definir modelo padrão.');
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingLogo(true);
    try {
      const url = await pdfDesignService.uploadAsset(file, 'logos', user.id);
      updateActiveModel({ logo_url: url });
      toast.success('Logo enviada.');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(error.message || 'Erro ao fazer upload da logo.');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingPhoto(true);
    try {
      const url = await pdfDesignService.uploadAsset(file, 'cover-images', user.id);
      updateActiveModel({ cover_photo_url: url });
      toast.success('Imagem da capa enviada.');
    } catch (error: any) {
      console.error('Error uploading cover image:', error);
      toast.error(error.message || 'Erro ao fazer upload da imagem.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  if (isLoading) {
    return <div className="text-brand-dark p-8">Carregando modelos de PDF...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Design PDF</h1>
          <p className="text-slate-500">Gerencie os modelos visuais usados nas suas propostas comerciais.</p>
        </div>
        <Button onClick={handleSave} disabled={!activeModel || isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Salvando...' : 'Salvar modelo'}
        </Button>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-brand-dark">Modelos padrão</h2>
            <p className="text-sm text-slate-500">Escolha uma capa original e adicione uma cópia editável.</p>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {coverTemplates.map((cover) => (
            <div
              key={cover.id}
              className="group relative min-w-[220px] overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="h-64 bg-gradient-to-br from-slate-950 via-slate-800 to-slate-200 p-4">
                {cover.thumbnail_url ? (
                  <img src={cover.thumbnail_url} alt={cover.name} className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <div className="h-full rounded-xl bg-white/95 p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <LayoutTemplate className="h-8 w-8 text-brand-blue" />
                      <ModelPalette theme={cover.default_theme || DEFAULT_PDF_THEME} />
                    </div>
                    <div>
                      <div className="h-24 rounded-xl bg-slate-100 border border-slate-200 mb-4" />
                      <div className="h-3 rounded-full bg-slate-900 w-3/4 mb-2" />
                      <div className="h-2 rounded-full bg-slate-300 w-1/2" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-brand-dark">{cover.name}</h3>
                <p className="text-xs text-slate-500 mt-1">Preset protegido do sistema</p>
              </div>
              <div className="absolute inset-0 bg-brand-dark/75 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <Button onClick={() => handleAddPreset(cover)} className="gap-2 bg-white text-brand-dark hover:bg-gray-100">
                  <Plus className="w-4 h-4" />
                  Adicionar modelo
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-brand-dark">Modelos adicionados</h2>
          <p className="text-sm text-slate-500">Edite, duplique, renomeie, exclua ou defina o modelo padrão das propostas.</p>
        </div>

        {userModels.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-border bg-white p-8 text-center">
            <LayoutTemplate className="mx-auto h-10 w-10 text-slate-400 mb-3" />
            <h3 className="font-semibold text-brand-dark">Nenhum modelo adicionado ainda</h3>
            <p className="text-sm text-slate-500 mt-1">Passe o mouse sobre um modelo padrão e clique em "Adicionar modelo".</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {userModels.map((model) => {
              const modelTheme = getTheme(model);
              const selected = activeModel?.id === model.id;

              return (
                <div
                  key={model.id}
                  className={`min-w-[260px] rounded-2xl border bg-white p-4 shadow-sm transition ${
                    selected ? 'border-brand-blue ring-2 ring-brand-blue/20' : 'border-brand-border hover:shadow-md'
                  }`}
                >
                  <div className="mb-4 h-40 rounded-xl border border-brand-border bg-gray-50 p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      {model.is_default ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-yellow/20 px-2 py-1 text-[11px] font-medium text-amber-700">
                          <Star className="w-3 h-3" /> Padrão
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">Modelo editável</span>
                      )}
                      <ModelPalette theme={modelTheme} />
                    </div>
                    <div>
                      <div className="h-3 rounded-full bg-slate-900 w-4/5 mb-2" />
                      <div className="h-2 rounded-full bg-slate-300 w-2/3" />
                    </div>
                  </div>

                  <h3 className="font-semibold text-brand-dark truncate">{model.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{model.is_default ? 'Usado automaticamente nas novas propostas' : 'Cópia independente'}</p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={() => { setActiveModel(model); setActiveTab('colors'); }} className="gap-1">
                      <PenTool className="w-3 h-3" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDuplicate(model)} className="gap-1">
                      <Copy className="w-3 h-3" /> Duplicar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRename(model)}>Renomear</Button>
                    <Button size="sm" variant="outline" onClick={() => handleSetDefault(model)}>Definir padrão</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(model)} className="col-span-2 gap-1">
                      <Trash2 className="w-3 h-3" /> Excluir
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-brand-border bg-white shadow-sm overflow-hidden">
        <div className="border-b border-brand-border p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-brand-dark">Editor unificado do modelo</h2>
            <p className="text-sm text-slate-500">Capa, cores, logo, imagem, páginas e gráficos em um só lugar.</p>
          </div>
          {activeModel && (
            <div className="text-sm text-slate-500">
              Editando: <span className="font-medium text-brand-dark">{activeModel.name}</span>
            </div>
          )}
        </div>

        {!activeModel ? (
          <div className="p-10 text-center text-slate-500">
            Adicione ou selecione um modelo para começar a editar.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-5 min-h-[720px]">
            <aside className="xl:col-span-2 border-r border-brand-border p-5 space-y-5">
              <div className="grid grid-cols-2 gap-2">
                {EDITOR_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                          : 'border-brand-border text-slate-500 hover:text-brand-dark hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === 'cover' && (
                <div className="space-y-4">
                  <div>
                    <Label>Nome do modelo</Label>
                    <Input value={activeModel.name} onChange={(e) => updateActiveModel({ name: e.target.value })} className="mt-2" />
                  </div>
                  <div>
                    <Label>Modelo de capa base</Label>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-auto pr-1">
                      {coverTemplates.map((cover) => (
                        <button
                          key={cover.id}
                          onClick={() => updateActiveModel({ cover_template_id: cover.id })}
                          className={`text-left rounded-lg border p-3 transition ${
                            activeModel.cover_template_id === cover.id
                              ? 'border-brand-blue bg-brand-blue/10'
                              : 'border-brand-border hover:bg-gray-50'
                          }`}
                        >
                          <span className="block text-sm font-medium text-brand-dark">{cover.name}</span>
                          <span className="block text-xs text-slate-500 mt-1">Troca apenas a capa base</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'colors' && (
                <div className="space-y-5">
                  <div className="rounded-xl bg-gray-50 border border-brand-border p-4">
                    <p className="text-sm font-medium text-brand-dark mb-1">Motor de 4 cores</p>
                    <p className="text-xs text-slate-500">O branco permanece fixo em #FFFFFF e não aparece como cor editável.</p>
                  </div>

                  {([
                    ['primary', 'Cor primária'],
                    ['secondary', 'Cor secundária'],
                    ['accent', 'Cor destaque'],
                    ['neutral', 'Cor neutra'],
                  ] as Array<[keyof PdfTheme, string]>).map(([key, label]) => (
                    <div key={key}>
                      <Label className="text-xs text-slate-500 mb-1 block">{label}</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={theme[key]} onChange={(e) => updateTheme(key, e.target.value)} className="w-14 p-1 h-10" />
                        <Input type="text" value={theme[key]} onChange={(e) => updateTheme(key, e.target.value)} className="flex-1 uppercase" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'logo' && (
                <div className="space-y-5">
                  <div>
                    <Label className="flex items-center gap-2 mb-2"><ImageIcon className="w-4 h-4" /> Upload de logo</Label>
                    <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                    {uploadingLogo && <p className="text-xs text-brand-blue mt-2">Enviando logo...</p>}
                  </div>
                  <div>
                    <Label>Ou cole o link da logo</Label>
                    <Input
                      value={activeModel.logo_url || ''}
                      onChange={(e) => updateActiveModel({ logo_url: e.target.value })}
                      placeholder="https://..."
                      className="mt-2"
                    />
                  </div>
                  {activeModel.logo_url && (
                    <div className="h-28 rounded-xl border border-brand-border bg-white p-3 flex items-center justify-center">
                      <img src={activeModel.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'image' && (
                <div className="space-y-5">
                  <div>
                    <Label className="flex items-center gap-2 mb-2"><Upload className="w-4 h-4" /> Upload da imagem da capa</Label>
                    <Input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                    {uploadingPhoto && <p className="text-xs text-brand-blue mt-2">Enviando imagem...</p>}
                  </div>
                  <div>
                    <Label>Ou cole o link da imagem</Label>
                    <Input
                      value={activeModel.cover_photo_url || ''}
                      onChange={(e) => updateActiveModel({ cover_photo_url: e.target.value })}
                      placeholder="https://..."
                      className="mt-2"
                    />
                  </div>

                  <div className="rounded-xl border border-brand-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-brand-dark">Ajustes da imagem</p>
                      <Button size="sm" variant="outline" onClick={() => updateCoverTransform(DEFAULT_IMAGE_TRANSFORM)} className="gap-1">
                        <RotateCcw className="w-3 h-3" /> Resetar
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Button size="sm" variant="outline" onClick={() => updateCoverTransform({ y: coverTransform.y - 10 })}><MoveUp className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => updateCoverTransform({ scale: Number((coverTransform.scale + 0.05).toFixed(2)) })}><ZoomIn className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => updateCoverTransform({ rotate: coverTransform.rotate + 5 })}><RotateCw className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => updateCoverTransform({ x: coverTransform.x - 10 })}><MoveLeft className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => updateCoverTransform({ scale: Math.max(0.2, Number((coverTransform.scale - 0.05).toFixed(2))) })}><ZoomOut className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => updateCoverTransform({ x: coverTransform.x + 10 })}><MoveRight className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => updateCoverTransform({ y: coverTransform.y + 10 })}><MoveDown className="w-4 h-4" /></Button>
                      <div className="rounded-md border border-brand-border bg-gray-50 flex items-center justify-center text-xs text-slate-500">{Math.round(coverTransform.scale * 100)}%</div>
                      <Button size="sm" variant="outline" onClick={() => updateCoverTransform({ rotate: coverTransform.rotate - 5 })}><RotateCcw className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pages' && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-gray-50 border border-brand-border p-4">
                    <p className="text-sm font-medium text-brand-dark mb-1">Configuração de páginas</p>
                    <p className="text-xs text-slate-500">A configuração fica salva dentro do modelo editável.</p>
                  </div>
                  {pageConfig.order.map((pageKey) => (
                    <label key={pageKey} className="flex items-center justify-between rounded-lg border border-brand-border p-3 cursor-pointer hover:bg-gray-50">
                      <span className="text-sm font-medium text-brand-dark">{PAGE_LABELS[pageKey] || pageKey}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(pageConfig.pages[pageKey])}
                        onChange={() => togglePage(pageKey)}
                        className="h-4 w-4 accent-brand-blue"
                      />
                    </label>
                  ))}
                </div>
              )}

              {activeTab === 'charts' && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-gray-50 border border-brand-border p-4">
                    <p className="text-sm font-medium text-brand-dark mb-1">Gráficos do PDF</p>
                    <p className="text-xs text-slate-500">Os gráficos usarão a mesma paleta do modelo: primária, secundária, destaque e neutra.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div className="rounded-lg border border-brand-border p-3">Payback: cor destaque</div>
                    <div className="rounded-lg border border-brand-border p-3">Economia: cor secundária</div>
                    <div className="rounded-lg border border-brand-border p-3">Títulos: cor primária</div>
                    <div className="rounded-lg border border-brand-border p-3">Textos: cor neutra</div>
                  </div>
                </div>
              )}
            </aside>

            <div className="xl:col-span-3 bg-gray-50 p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-brand-dark">Pré-visualização da capa</h3>
                  <p className="text-xs text-slate-500">As páginas internas herdarão esta paleta global.</p>
                </div>
                <ModelPalette theme={theme} />
              </div>

              <div className="flex-1 min-h-[640px] rounded-xl border border-brand-border bg-white overflow-hidden">
                <SvgPreview
                  svgUrl={activeCover?.svg_file_url || ''}
                  primaryColor={theme.primary}
                  secondaryColor={theme.secondary}
                  accentColor={theme.accent}
                  neutralColor={theme.neutral}
                  backgroundColor="#FFFFFF"
                  logoUrl={activeModel.logo_url || ''}
                  coverPhotoUrl={activeModel.cover_photo_url || ''}
                  logoTransform={logoTransform}
                  coverImageTransform={coverTransform}
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
