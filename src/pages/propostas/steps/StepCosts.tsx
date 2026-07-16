import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Label } from '../../../components/ui/Label';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { calcularPrecoProposta } from '../../../lib/calculations/pricing';
import { ProposalFormValues } from '../../../lib/validations/proposal.schema';
import { solarKitService } from '../../../services/solarKitService';
import { buildSolarKitSnapshot, SOLAR_SYSTEM_TYPE_LABELS, SolarKit, SolarSystemType } from '../../../types/solarKit';
import { AlertCircle, BatteryCharging, CheckCircle2, Loader2, Package, Plus, RefreshCw, Trash2 } from 'lucide-react';

const formatNumber = (val: any) => {
  if (val === '' || val === null || val === undefined) return 0;
  const parsed = Number(String(val).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value: number) => Number(value.toFixed(2));
const formatMoney = (val: number) => 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const resolveRequiredKwp = (values: Partial<ProposalFormValues>) => {
  const monthlyConsumption = formatNumber(values.monthly_consumption_kwh);
  const billAmount = formatNumber(values.bill_amount);
  const energyTariff = formatNumber(values.energy_tariff);
  const hsp = formatNumber(values.hsp);
  const yieldFactor = formatNumber(values.yield_factor) || 0.8;
  const generationTargetPercent = formatNumber(values.generation_target_percent) || 100;

  const resolvedConsumption = monthlyConsumption > 0
    ? monthlyConsumption
    : billAmount > 0 && energyTariff > 0
      ? billAmount / energyTariff
      : 0;

  const projectedConsumption = resolvedConsumption * (generationTargetPercent / 100);

  if (projectedConsumption <= 0 || hsp <= 0 || yieldFactor <= 0) return 0;
  return projectedConsumption / (hsp * 30 * yieldFactor);
};

const isStorageSystem = (systemType?: string | null) => systemType === 'hybrid' || systemType === 'off_grid';

export function StepCosts() {
  const { register, control, setValue } = useFormContext<ProposalFormValues>();
  const [kits, setKits] = useState<SolarKit[]>([]);
  const [isLoadingKits, setIsLoadingKits] = useState(true);

  const { fields, append, remove } = useFieldArray({ control, name: 'additional_costs' });

  const formValues = useWatch({ control }) as Partial<ProposalFormValues>;
  const additionalCosts = useWatch({ control, name: 'additional_costs' }) || [];

  const selectedSolarKitId = formValues.selected_solar_kit_id || '';
  const selectedSystemType = (formValues.system_type || 'on_grid') as SolarSystemType;
  const kit_cost = formValues.kit_cost;
  const labor_cost = formValues.labor_cost;
  const fixed_costs = formValues.fixed_costs;
  const freight_cost = formValues.freight_cost;
  const taxes = formValues.taxes;
  const commission = formValues.commission;
  const margin_percentage = formValues.margin_percentage;
  const discount_percentage = formValues.discount_percentage;

  useEffect(() => {
    async function loadKits() {
      try {
        setIsLoadingKits(true);
        const data = await solarKitService.getActiveKits();
        setKits(data);
      } catch (err) {
        console.error('Error loading solar kits:', err);
      } finally {
        setIsLoadingKits(false);
      }
    }

    loadKits();
  }, []);

  const additionalCostsTotal = useMemo(() => {
    return roundMoney(additionalCosts.reduce((sum, item) => sum + Math.max(0, formatNumber(item?.amount)), 0));
  }, [additionalCosts]);

  useEffect(() => {
    setValue('other_costs', additionalCostsTotal > 0 ? additionalCostsTotal : '', { shouldDirty: true, shouldValidate: false });
  }, [additionalCostsTotal, setValue]);

  const requiredKwp = useMemo(() => resolveRequiredKwp(formValues), [formValues]);
  const recommendedKit = useMemo(() => solarKitService.recommendKit(kits, requiredKwp, selectedSystemType), [kits, requiredKwp, selectedSystemType]);
  const selectedKit = useMemo(() => kits.find((kit) => kit.id === selectedSolarKitId) || null, [kits, selectedSolarKitId]);

  const applyKitToProposal = (kit: SolarKit) => {
    const systemType = kit.system_type || 'on_grid';

    setValue('selected_solar_kit_id', kit.id, { shouldDirty: true, shouldValidate: false });
    setValue('solar_kit_snapshot', buildSolarKitSnapshot(kit), { shouldDirty: true, shouldValidate: false });
    setValue('system_type', systemType, { shouldDirty: true, shouldValidate: false });
    setValue('kit_cost', kit.cost_price || '', { shouldDirty: true, shouldValidate: true });
    setValue('panel_power_w', kit.module_power_w || '', { shouldDirty: true, shouldValidate: true });

    if (isStorageSystem(systemType)) {
      setValue('battery_capacity_kwh', kit.battery_capacity_kwh || '', { shouldDirty: true, shouldValidate: false });
      setValue('usable_battery_capacity_kwh', kit.usable_battery_capacity_kwh || '', { shouldDirty: true, shouldValidate: false });
      setValue('backup_power_kw', kit.backup_power_kw || '', { shouldDirty: true, shouldValidate: false });
      setValue('autonomy_hours', kit.autonomy_hours || '', { shouldDirty: true, shouldValidate: false });
      setValue('essential_loads_description', kit.essential_loads_description || '', { shouldDirty: true, shouldValidate: false });
    }
  };

  const clearSelectedKit = () => {
    setValue('selected_solar_kit_id', '', { shouldDirty: true, shouldValidate: false });
    setValue('solar_kit_snapshot', null, { shouldDirty: true, shouldValidate: false });
  };

  const handleSelectKit = (kitId: string) => {
    const kit = kits.find((item) => item.id === kitId);
    if (kit) applyKitToProposal(kit);
    else clearSelectedKit();
  };

  const result = calcularPrecoProposta({
    kit_cost: formatNumber(kit_cost),
    labor_cost: formatNumber(labor_cost),
    fixed_costs: formatNumber(fixed_costs),
    freight_cost: formatNumber(freight_cost),
    taxes: formatNumber(taxes),
    commission: formatNumber(commission),
    other_costs: additionalCostsTotal,
    margin_percentage: formatNumber(margin_percentage),
    discount_percentage: formatNumber(discount_percentage),
  });

  const marginWarning = result.real_margin_percentage < formatNumber(margin_percentage) && formatNumber(discount_percentage) > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-brand-blue" />
              <h3 className="text-sm font-semibold text-brand-dark">Kit solar da proposta</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Escolha um kit cadastrado. Kits híbridos preenchem automaticamente bateria, backup e autonomia.
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-right">
            <p className="text-[11px] text-slate-500">Potência necessária estimada</p>
            <p className="text-sm font-bold text-brand-dark">{requiredKwp > 0 ? `${requiredKwp.toFixed(2)} kWp` : 'Informe consumo e HSP'}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-2">
            <Label htmlFor="selected_solar_kit_id">Selecionar kit cadastrado</Label>
            <select
              id="selected_solar_kit_id"
              value={selectedSolarKitId}
              onChange={(event) => handleSelectKit(event.target.value)}
              className="flex h-10 w-full rounded-md border border-brand-border bg-gray-50 px-3 py-2 text-sm text-brand-dark outline-none ring-offset-brand-gray transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
              disabled={isLoadingKits}
            >
              <option value="">Selecionar manualmente...</option>
              {kits.map((kit) => (
                <option key={kit.id} value={kit.id}>
                  {SOLAR_SYSTEM_TYPE_LABELS[kit.system_type || 'on_grid']} — {kit.name} — {Number(kit.kit_power_kwp || 0).toFixed(2)} kWp — {formatMoney(Number(kit.cost_price || 0))}
                </option>
              ))}
            </select>
          </div>

          <Button type="button" variant="outline" className="gap-2" disabled={!recommendedKit || isLoadingKits} onClick={() => recommendedKit && applyKitToProposal(recommendedKit)}>
            {isLoadingKits ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Usar recomendado
          </Button>
        </div>

        {recommendedKit && (
          <div className="mt-3 rounded-lg border border-brand-blue/20 bg-brand-blue/10 p-3 text-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-brand-dark">Kit recomendado: {recommendedKit.name}</p>
                <p className="text-xs text-slate-500">
                  {SOLAR_SYSTEM_TYPE_LABELS[recommendedKit.system_type || 'on_grid']} · {Number(recommendedKit.kit_power_kwp || 0).toFixed(2)} kWp · {recommendedKit.module_quantity} módulos de {recommendedKit.module_power_w} W
                  {recommendedKit.inverter_power_kw ? ` · Inversor ${recommendedKit.inverter_power_kw} kW` : ''}
                </p>
              </div>
              {selectedKit?.id === recommendedKit.id && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" /> Aplicado
                </span>
              )}
            </div>
          </div>
        )}

        {!isLoadingKits && kits.length === 0 && (
          <div className="mt-3 rounded-lg border border-dashed border-brand-border bg-gray-50 p-3 text-xs text-slate-500">
            Nenhum kit ativo cadastrado ainda. Cadastre kits em <strong>Kits Solares</strong> para liberar a recomendação automática.
          </div>
        )}

        {selectedKit && (
          <div className="mt-3 flex flex-col gap-2 rounded-lg border border-brand-border bg-gray-50 p-3 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
            <span>
              Kit aplicado: <strong className="text-brand-dark">{selectedKit.name}</strong> · tipo <strong className="text-brand-dark">{SOLAR_SYSTEM_TYPE_LABELS[selectedKit.system_type || 'on_grid']}</strong> · custo lançado em Custo do Kit.
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={clearSelectedKit}>Remover vínculo do kit</Button>
          </div>
        )}

        {selectedKit && isStorageSystem(selectedKit.system_type) && (
          <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-slate-500">
            <div className="flex items-start gap-2">
              <BatteryCharging className="mt-0.5 h-4 w-4 text-amber-500" />
              <div>
                <p className="font-semibold text-brand-dark">Dados híbridos aplicados</p>
                <p>
                  {selectedKit.battery_capacity_kwh ? `${selectedKit.battery_capacity_kwh} kWh de bateria` : 'Bateria sem capacidade informada'}
                  {selectedKit.usable_battery_capacity_kwh ? ` · ${selectedKit.usable_battery_capacity_kwh} kWh úteis` : ''}
                  {selectedKit.backup_power_kw ? ` · ${selectedKit.backup_power_kw} kW backup` : ''}
                  {selectedKit.autonomy_hours ? ` · ${selectedKit.autonomy_hours}h autonomia` : ''}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-brand-dark">Custos principais</h3>
          <p className="text-xs text-slate-500 mt-1">Informe os custos fixos da proposta. Custos extras podem ser adicionados abaixo.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {([
            ['kit_cost', 'Custo do Kit (R$)'],
            ['labor_cost', 'Mão de Obra (R$)'],
            ['fixed_costs', 'Custos Fixos (R$)'],
            ['freight_cost', 'Frete (R$)'],
            ['taxes', 'Impostos (R$)'],
            ['commission', 'Comissão (R$)'],
          ] as const).map(([field, label]) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field}>{label}</Label>
              <Input id={field} type="number" step="0.01" placeholder="0.00" {...register(field)} />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-brand-border pt-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-medium text-brand-dark">Custos adicionais</h3>
            <p className="text-xs text-slate-500 mt-1">Adicione linhas como deslocamento, ART, projeto, homologação, içamento ou materiais extras.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', amount: '' })} className="gap-2">
            <Plus className="w-4 h-4" /> Adicionar Custo
          </Button>
        </div>

        <input type="hidden" {...register('other_costs')} />

        {fields.length === 0 ? (
          <div className="rounded-lg border border-dashed border-brand-border bg-brand-surface p-4 text-sm text-slate-500">Nenhum custo adicional informado. Clique em <strong>+ Adicionar Custo</strong> para incluir custos extras.</div>
        ) : (
          <div className="space-y-3 scroll-after-3-compact">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_180px_44px] gap-3 items-end rounded-lg border border-brand-border bg-gray-50 p-3">
                <div className="space-y-2">
                  <Label htmlFor={`additional_costs.${index}.description`}>Descrição do custo</Label>
                  <Input id={`additional_costs.${index}.description`} placeholder="Ex: ART, homologação, deslocamento" {...register(`additional_costs.${index}.description` as const)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`additional_costs.${index}.amount`}>Valor (R$)</Label>
                  <Input id={`additional_costs.${index}.amount`} type="number" step="0.01" min="0" placeholder="0.00" {...register(`additional_costs.${index}.amount` as const)} />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10" aria-label="Remover custo adicional">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center rounded-lg bg-brand-surface border border-brand-border p-4">
          <span className="text-slate-500">Total dos custos adicionais</span>
          <span className="font-bold text-brand-dark">{formatMoney(additionalCostsTotal)}</span>
        </div>
      </div>

      <div className="border-t border-brand-border pt-6">
        <h3 className="text-sm font-medium text-brand-dark mb-4">Margem e Desconto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="margin_percentage">Margem Desejada (%)</Label><Input id="margin_percentage" type="number" step="0.01" placeholder="0.00" {...register('margin_percentage')} /></div>
          <div className="space-y-2"><Label htmlFor="discount_percentage">Desconto (%)</Label><Input id="discount_percentage" type="number" step="0.01" placeholder="0.00" {...register('discount_percentage')} /></div>
        </div>
      </div>

      <div className="border border-brand-border rounded-lg bg-brand-surface overflow-hidden">
        <div className="bg-gray-50 border-b border-brand-border p-4 flex justify-between items-center"><h3 className="font-medium text-brand-dark">Resumo Financeiro</h3></div>
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center"><span className="text-slate-500">Custo Total</span><span className="text-brand-dark font-medium">{formatMoney(result.total_cost)}</span></div>
          {additionalCostsTotal > 0 && <div className="flex justify-between items-center"><span className="text-slate-500">Custos adicionais</span><span className="text-brand-dark font-medium">{formatMoney(additionalCostsTotal)}</span></div>}
          <div className="flex justify-between items-center"><span className="text-slate-500">Preço de Venda Bruto</span><span className="text-brand-dark font-medium">{formatMoney(result.gross_price)}</span></div>
          <div className="flex justify-between items-center"><span className="text-slate-500">Desconto</span><span className="text-red-400 font-medium">- {formatMoney(result.discount_value)}</span></div>
          <div className="flex justify-between items-center pt-2 border-t border-brand-border"><span className="text-brand-dark font-medium">Preço Final</span><span className="text-xl font-bold text-brand-dark">{formatMoney(result.final_price)}</span></div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-brand-border">
            <div className="p-3 bg-gray-50 rounded-lg"><span className="block text-xs text-slate-500 mb-1">Lucro Estimado</span><span className="text-lg font-bold text-emerald-500">{formatMoney(result.estimated_profit)}</span></div>
            <div className={`p-3 rounded-lg ${marginWarning ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}><span className="block text-xs text-slate-500 mb-1">Margem Real</span><span className={`text-lg font-bold ${marginWarning ? 'text-red-400' : 'text-emerald-500'}`}>{result.real_margin_percentage.toFixed(2)}%</span></div>
          </div>

          {marginWarning && (
            <div className="flex items-center gap-2 p-3 text-sm text-brand-blue bg-brand-blue/10 rounded-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>Atenção: O desconto aplicado reduziu a margem real para abaixo da margem desejada ({formatNumber(margin_percentage)}%).</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
