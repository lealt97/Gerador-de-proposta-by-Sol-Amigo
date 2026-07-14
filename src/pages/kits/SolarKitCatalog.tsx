import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Copy, Edit3, Loader2, Package, Plus, Power, Save, Search, Trash2, X, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { solarKitService } from '../../services/solarKitService';
import { SolarKit, SolarKitFormValues } from '../../types/solarKit';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../lib/utils';

type SolarKitFormState = {
  name: string;
  supplier: string;
  module_brand: string;
  module_model: string;
  module_power_w: string;
  module_quantity: string;
  inverter_brand: string;
  inverter_model: string;
  inverter_power_kw: string;
  structure_type: string;
  cost_price: string;
  sale_price: string;
  active: boolean;
  notes: string;
};

const EMPTY_FORM: SolarKitFormState = {
  name: '',
  supplier: '',
  module_brand: '',
  module_model: '',
  module_power_w: '',
  module_quantity: '',
  inverter_brand: '',
  inverter_model: '',
  inverter_power_kw: '',
  structure_type: '',
  cost_price: '',
  sale_price: '',
  active: true,
  notes: '',
};

const parseNumber = (value: string) => {
  if (!value) return 0;
  return Number(value.replace(',', '.')) || 0;
};

const parseOptionalNumber = (value: string) => {
  if (!value) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const toFormState = (kit: SolarKit): SolarKitFormState => ({
  name: kit.name || '',
  supplier: kit.supplier || '',
  module_brand: kit.module_brand || '',
  module_model: kit.module_model || '',
  module_power_w: String(kit.module_power_w || ''),
  module_quantity: String(kit.module_quantity || ''),
  inverter_brand: kit.inverter_brand || '',
  inverter_model: kit.inverter_model || '',
  inverter_power_kw: kit.inverter_power_kw ? String(kit.inverter_power_kw) : '',
  structure_type: kit.structure_type || '',
  cost_price: kit.cost_price ? String(kit.cost_price) : '',
  sale_price: kit.sale_price ? String(kit.sale_price) : '',
  active: kit.active,
  notes: kit.notes || '',
});

const toPayload = (form: SolarKitFormState): SolarKitFormValues => ({
  name: form.name,
  supplier: form.supplier || null,
  module_brand: form.module_brand || null,
  module_model: form.module_model || null,
  module_power_w: parseNumber(form.module_power_w),
  module_quantity: Math.round(parseNumber(form.module_quantity)),
  inverter_brand: form.inverter_brand || null,
  inverter_model: form.inverter_model || null,
  inverter_power_kw: parseOptionalNumber(form.inverter_power_kw),
  structure_type: form.structure_type || null,
  cost_price: parseNumber(form.cost_price),
  sale_price: parseOptionalNumber(form.sale_price),
  active: form.active,
  notes: form.notes || null,
});

export function SolarKitCatalog() {
  const { user } = useAuth();
  const [kits, setKits] = useState<SolarKit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingKit, setEditingKit] = useState<SolarKit | null>(null);
  const [form, setForm] = useState<SolarKitFormState>(EMPTY_FORM);

  const loadKits = async () => {
    try {
      setIsLoading(true);
      const data = await solarKitService.getKits();
      setKits(data);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar kits solares');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadKits();
  }, []);

  const filteredKits = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return kits;

    return kits.filter((kit) =>
      [
        kit.name,
        kit.supplier,
        kit.module_brand,
        kit.module_model,
        kit.inverter_brand,
        kit.inverter_model,
        kit.structure_type,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [kits, searchTerm]);

  const activeKits = kits.filter((kit) => kit.active);
  const totalPowerKwp = kits.reduce((sum, kit) => sum + Number(kit.kit_power_kwp || 0), 0);
  const averageCost = kits.length > 0 ? kits.reduce((sum, kit) => sum + Number(kit.cost_price || 0), 0) / kits.length : 0;

  const kitPowerPreview = (parseNumber(form.module_power_w) * parseNumber(form.module_quantity)) / 1000;

  const updateField = (name: keyof SolarKitFormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const startCreate = () => {
    setEditingKit(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const startEdit = (kit: SolarKit) => {
    setEditingKit(kit);
    setForm(toFormState(kit));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingKit(null);
    setForm(EMPTY_FORM);
  };

  const validateForm = () => {
    if (!form.name.trim()) return 'Informe o nome do kit.';
    if (parseNumber(form.module_power_w) <= 0) return 'Informe a potência do módulo em W.';
    if (parseNumber(form.module_quantity) <= 0) return 'Informe a quantidade de módulos.';
    if (parseNumber(form.cost_price) < 0) return 'O custo do kit não pode ser negativo.';
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSaving(true);
    try {
      const payload = toPayload(form);
      if (editingKit) {
        await solarKitService.updateKit(editingKit.id, payload);
        toast.success('Kit atualizado com sucesso!');
      } else {
        await solarKitService.createKit(payload, user.id);
        toast.success('Kit cadastrado com sucesso!');
      }

      closeForm();
      await loadKits();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar kit');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async (kit: SolarKit) => {
    if (!user) return;

    try {
      await solarKitService.duplicateKit(kit, user.id);
      toast.success('Kit duplicado com sucesso!');
      await loadKits();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao duplicar kit');
    }
  };

  const handleToggleStatus = async (kit: SolarKit) => {
    try {
      await solarKitService.toggleKitStatus(kit.id, !kit.active);
      toast.success(kit.active ? 'Kit desativado.' : 'Kit ativado.');
      await loadKits();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar status do kit');
    }
  };

  const handleDelete = async (kit: SolarKit) => {
    const confirmed = window.confirm(`Excluir o kit "${kit.name}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    try {
      await solarKitService.deleteKit(kit.id);
      toast.success('Kit excluído com sucesso!');
      await loadKits();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir kit');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Catálogo de Kits Solares</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cadastre kits reais para o sistema recomendar automaticamente nas propostas.
          </p>
        </div>
        <Button className="gap-2" onClick={startCreate}>
          <Plus className="h-4 w-4" />
          Novo Kit Solar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Kits cadastrados</p>
              <p className="text-xl font-bold text-brand-dark">{kits.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Power className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Ativos para recomendação</p>
              <p className="text-xl font-bold text-brand-dark">{activeKits.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Potência total cadastrada</p>
              <p className="text-xl font-bold text-brand-dark">{totalPowerKwp.toFixed(2)} kWp</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{editingKit ? 'Editar Kit Solar' : 'Novo Kit Solar'}</CardTitle>
            <CardDescription>
              A potência do kit é calculada automaticamente por potência do módulo × quantidade.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-brand-dark">Nome do kit *</label>
                  <Input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Ex: Kit 6,60 kWp - Telhado Cerâmico" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-dark">Fornecedor</label>
                  <Input value={form.supplier} onChange={(event) => updateField('supplier', event.target.value)} placeholder="Ex: Aldo, Genyx, Sices" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-dark">Tipo de estrutura</label>
                  <Input value={form.structure_type} onChange={(event) => updateField('structure_type', event.target.value)} placeholder="Cerâmico, fibrocimento, metálico..." />
                </div>
              </div>

              <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
                <h3 className="mb-4 text-sm font-semibold text-brand-dark">Módulos Fotovoltaicos</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">Marca</label>
                    <Input value={form.module_brand} onChange={(event) => updateField('module_brand', event.target.value)} placeholder="Ex: Canadian" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">Modelo</label>
                    <Input value={form.module_model} onChange={(event) => updateField('module_model', event.target.value)} placeholder="Ex: HiKu6" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">Potência W *</label>
                    <Input type="number" min="0" step="1" value={form.module_power_w} onChange={(event) => updateField('module_power_w', event.target.value)} placeholder="550" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">Quantidade *</label>
                    <Input type="number" min="0" step="1" value={form.module_quantity} onChange={(event) => updateField('module_quantity', event.target.value)} placeholder="12" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
                <h3 className="mb-4 text-sm font-semibold text-brand-dark">Inversor</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">Marca</label>
                    <Input value={form.inverter_brand} onChange={(event) => updateField('inverter_brand', event.target.value)} placeholder="Ex: Growatt" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">Modelo</label>
                    <Input value={form.inverter_model} onChange={(event) => updateField('inverter_model', event.target.value)} placeholder="Ex: MIN 5000TL-X" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">Potência kW</label>
                    <Input type="number" min="0" step="0.01" value={form.inverter_power_kw} onChange={(event) => updateField('inverter_power_kw', event.target.value)} placeholder="5" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-dark">Custo do kit *</label>
                  <Input type="number" min="0" step="0.01" value={form.cost_price} onChange={(event) => updateField('cost_price', event.target.value)} placeholder="12000" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-dark">Preço de venda sugerido</label>
                  <Input type="number" min="0" step="0.01" value={form.sale_price} onChange={(event) => updateField('sale_price', event.target.value)} placeholder="Opcional" />
                </div>
                <div className="rounded-lg border border-brand-border bg-gray-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Potência calculada</p>
                  <p className="mt-1 text-lg font-bold text-brand-dark">{kitPowerPreview.toFixed(2)} kWp</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-brand-dark">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-brand-border bg-gray-50 px-3 py-2 text-sm text-brand-dark outline-none ring-offset-brand-gray transition-colors placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
                  placeholder="Itens inclusos, condição comercial, observações do fornecedor..."
                />
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-brand-border bg-gray-50 px-4 py-3 text-sm text-brand-dark">
                <input type="checkbox" checked={form.active} onChange={(event) => updateField('active', event.target.checked)} />
                Kit ativo para recomendação automática
              </label>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="gap-2" onClick={closeForm} disabled={isSaving}>
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button type="submit" className="gap-2" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? 'Salvando...' : editingKit ? 'Salvar alterações' : 'Cadastrar kit'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-brand-border bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input className="pl-9" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por kit, fornecedor, módulo ou inversor..." />
          </div>
          <div className="text-xs text-slate-500">
            Custo médio cadastrado: <span className="font-semibold text-brand-dark">{formatCurrency(averageCost)}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-gray text-[10px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Kit</th>
                <th className="px-4 py-3 font-medium">Potência</th>
                <th className="px-4 py-3 font-medium">Módulos</th>
                <th className="px-4 py-3 font-medium">Inversor</th>
                <th className="px-4 py-3 font-medium">Custo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-brand-surface">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando kits solares...
                    </div>
                  </td>
                </tr>
              ) : filteredKits.length > 0 ? (
                filteredKits.map((kit) => (
                  <tr key={kit.id} className="border-b border-brand-border hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-brand-dark">{kit.name}</div>
                      <div className="text-[11px] text-slate-500">{kit.supplier || 'Fornecedor não informado'}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-brand-dark">{Number(kit.kit_power_kwp || 0).toFixed(2)} kWp</td>
                    <td className="px-4 py-3 text-brand-dark">
                      <div>{kit.module_quantity} × {kit.module_power_w} W</div>
                      <div className="text-[11px] text-slate-500">{[kit.module_brand, kit.module_model].filter(Boolean).join(' ') || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-brand-dark">
                      <div>{kit.inverter_power_kw ? `${kit.inverter_power_kw} kW` : '-'}</div>
                      <div className="text-[11px] text-slate-500">{[kit.inverter_brand, kit.inverter_model].filter(Boolean).join(' ') || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-brand-dark">{formatCurrency(Number(kit.cost_price || 0))}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${kit.active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                        {kit.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => startEdit(kit)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Duplicar" onClick={() => handleDuplicate(kit)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title={kit.active ? 'Desativar' : 'Ativar'} onClick={() => handleToggleStatus(kit)}>
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-600" title="Excluir" onClick={() => handleDelete(kit)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-brand-dark">Nenhum kit solar encontrado.</p>
                    <p className="mt-1 text-xs text-slate-500">Cadastre o primeiro kit para liberar a recomendação automática nas próximas etapas.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
