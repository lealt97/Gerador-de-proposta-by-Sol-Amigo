import { supabase } from '../lib/supabase/client';
import { calcularPayback } from '../lib/calculations/payback';
import { calcularPrecoProposta } from '../lib/calculations/pricing';
import { calcularSistemaSolar } from '../lib/calculations/solar';
import {
  PersistProposalBundleInput,
  createProposalOperations,
} from '../lib/proposals/proposalOperations';
import { ProposalFormValues } from '../lib/validations/proposal.schema';
import { Proposal } from '../types/proposal';

const profileSelect = 'company_name, logo_url, seller_name, seller_phone, seller_email, seller_signature_url, website, company_email, default_validity_days, default_margin_percentage';
const clientSelect = 'name, document, email, phone, city, state';

const formatNumber = (value: unknown): number | null => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeSystemType = (value?: string | null) => {
  if (value === 'hybrid' || value === 'off_grid') return value;
  return 'on_grid';
};

const buildSecurePdfUrl = (publicToken?: string | null) => {
  if (!publicToken) return null;
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/functions/v1/public-proposal-pdf?token=${encodeURIComponent(publicToken)}`;
};

const getAdditionalCostsTotal = (proposal: Partial<ProposalFormValues>) => {
  return (proposal.additional_costs || []).reduce((sum, cost) => {
    const amount = formatNumber(cost.amount) || 0;
    return sum + Math.max(0, amount);
  }, 0);
};

const resolveOtherCosts = (proposal: Partial<ProposalFormValues>) => {
  const additionalCostsTotal = getAdditionalCostsTotal(proposal);
  if (additionalCostsTotal > 0) return Number(additionalCostsTotal.toFixed(2));
  return formatNumber(proposal.other_costs) || 0;
};

const buildPricing = (proposal: Partial<ProposalFormValues>) => {
  const otherCosts = resolveOtherCosts(proposal);
  const pricing = calcularPrecoProposta({
    kit_cost: formatNumber(proposal.kit_cost) || 0,
    labor_cost: formatNumber(proposal.labor_cost) || 0,
    fixed_costs: formatNumber(proposal.fixed_costs) || 0,
    freight_cost: formatNumber(proposal.freight_cost) || 0,
    taxes: formatNumber(proposal.taxes) || 0,
    commission: formatNumber(proposal.commission) || 0,
    other_costs: otherCosts,
    margin_percentage: formatNumber(proposal.margin_percentage) || 0,
    discount_percentage: formatNumber(proposal.discount_percentage) || 0,
  });

  return { pricing, otherCosts };
};

function buildProposalPayload(values: ProposalFormValues) {
  const { pricing, otherCosts } = buildPricing(values);

  return {
    client_id: values.client_id,
    title: values.title || 'Nova Proposta',
    consumption_source: values.consumption_source || 'average',
    history: values.history || [],
    estimated_daily_consumption: formatNumber(values.estimated_daily_consumption),
    monthly_consumption_kwh: formatNumber(values.monthly_consumption_kwh),
    bill_amount: formatNumber(values.bill_amount),
    energy_tariff: formatNumber(values.energy_tariff),
    system_type: normalizeSystemType(values.system_type),
    battery_capacity_kwh: formatNumber(values.battery_capacity_kwh),
    usable_battery_capacity_kwh: formatNumber(values.usable_battery_capacity_kwh),
    backup_power_kw: formatNumber(values.backup_power_kw),
    autonomy_hours: formatNumber(values.autonomy_hours),
    essential_loads_description: values.essential_loads_description || null,
    selected_solar_kit_id: values.selected_solar_kit_id || null,
    solar_kit_snapshot: values.solar_kit_snapshot || null,
    roof_type: values.roof_type || null,
    roof_area_m2: formatNumber(values.roof_area_m2),
    roof_image_url: values.roof_image_url || null,
    module_width_m: formatNumber(values.module_width_m),
    module_height_m: formatNumber(values.module_height_m),
    roof_layout_json: values.roof_layout_json || null,
    kit_cost: formatNumber(values.kit_cost),
    labor_cost: formatNumber(values.labor_cost),
    fixed_costs: formatNumber(values.fixed_costs),
    freight_cost: formatNumber(values.freight_cost),
    taxes: formatNumber(values.taxes),
    commission: formatNumber(values.commission),
    other_costs: otherCosts || null,
    margin_percentage: formatNumber(values.margin_percentage),
    discount_percentage: formatNumber(values.discount_percentage),
    total_cost: pricing.total_cost,
    gross_price: pricing.gross_price,
    discount_value: pricing.discount_value,
    final_price: pricing.final_price,
    estimated_profit: pricing.estimated_profit,
    real_margin_percentage: pricing.real_margin_percentage,
    markup_percentage: pricing.markup_percentage,
  };
}

function buildSolarPayload(values: ProposalFormValues, finalPrice: number) {
  const calc = calcularSistemaSolar({
    hsp: formatNumber(values.hsp) || 0,
    panel_power_w: formatNumber(values.panel_power_w) || 0,
    yield_factor: formatNumber(values.yield_factor) || 0.8,
    generation_target_percent: formatNumber(values.generation_target_percent) || 100,
    oversizing: formatNumber(values.oversizing) || 1.2,
    monthly_consumption_kwh: formatNumber(values.monthly_consumption_kwh) || undefined,
    current_bill_value: formatNumber(values.bill_amount) || undefined,
    energy_tariff: formatNumber(values.energy_tariff) || undefined,
  });

  const payback = calc && finalPrice > 0
    ? calcularPayback({
        investimentoTotal: finalPrice,
        economiaMensal: calc.monthly_savings,
        economiaAnual: calc.annual_savings,
      })
    : null;

  return {
    cep: values.cep || null,
    hsp: formatNumber(values.hsp),
    panel_power_w: formatNumber(values.panel_power_w),
    yield_factor: formatNumber(values.yield_factor) || 0.8,
    generation_target_percent: formatNumber(values.generation_target_percent) || 100,
    oversizing: formatNumber(values.oversizing) || 1.2,
    history: values.history || [],
    monthly_consumption_kwh: calc?.monthly_consumption_kwh ?? formatNumber(values.monthly_consumption_kwh),
    projected_consumption_kwh: calc?.projected_consumption_kwh ?? null,
    required_power_kwp: calc?.required_power_kwp ?? null,
    panel_count: calc?.panel_count ?? null,
    installed_power_kwp: calc?.installed_power_kwp ?? null,
    estimated_monthly_generation_kwh: calc?.estimated_monthly_generation_kwh ?? null,
    excess_kwh: calc?.excess_kwh ?? null,
    excess_percentage: calc?.excess_percentage ?? null,
    min_inverter_power_kw: calc?.min_inverter_power_kw ?? null,
    current_bill_value: calc
      ? calc.energy_tariff * calc.monthly_consumption_kwh
      : formatNumber(values.bill_amount),
    energy_tariff: calc?.energy_tariff ?? formatNumber(values.energy_tariff),
    monthly_savings: calc?.monthly_savings ?? null,
    annual_savings: calc?.annual_savings ?? null,
    payback_years: payback?.paybackAnos ?? null,
    payback_months: payback?.paybackMeses ?? null,
    payback_formatted: payback?.paybackFormatado ?? null,
    return_25_years: payback?.retorno25Anos ?? null,
    net_savings_25_years: payback?.economiaLiquida25Anos ?? null,
  };
}

function buildLoadsPayload(values: ProposalFormValues) {
  return (values.loads || []).map((load) => {
    const power = formatNumber(load.power_watts) || 0;
    const quantity = formatNumber(load.quantity) || 0;
    const hours = formatNumber(load.hours_per_day) || 0;
    const calculatedDailyConsumption = (power * quantity * hours) / 1000;

    return {
      equipment_name: String(load.equipment_name || '').trim(),
      power_watts: power,
      quantity,
      hours_per_day: hours,
      daily_consumption: formatNumber(load.daily_consumption) ?? calculatedDailyConsumption,
    };
  });
}

async function persistProposalBundle(input: PersistProposalBundleInput): Promise<Proposal> {
  const proposalPayload = buildProposalPayload(input.values);
  const finalPrice = Number(proposalPayload.final_price || 0);
  const solarPayload = buildSolarPayload(input.values, finalPrice);
  const loadsPayload = buildLoadsPayload(input.values);

  const { data, error } = await supabase.rpc('save_proposal_bundle', {
    p_proposal_id: input.proposalId,
    p_expected_revision: input.expectedRevision,
    p_proposal: proposalPayload,
    p_solar: solarPayload,
    p_loads: loadsPayload,
    p_event_type: input.eventType,
    p_event_description: input.eventDescription,
  });

  if (error) throw error;

  const saved = Array.isArray(data) ? data[0] : data;
  if (!saved?.id) throw new Error('O banco não retornou a proposta salva.');
  return saved as Proposal;
}

async function getProposals(): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select(`*, client:clients(${clientSelect}), solar:solar_system_calculations(installed_power_kwp), profile:profiles(${profileSelect})`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Proposal[];
}

async function getProposalById(id: string): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .select(`*, client:clients(${clientSelect}), solar:solar_system_calculations(*), loads:proposal_loads(*), profile:profiles(${profileSelect})`)
    .eq('id', id)
    .single();

  if (error) throw error;

  if (data && Array.isArray(data.solar) && data.solar.length > 0) {
    data.solar = data.solar[0];
  } else if (Array.isArray(data?.solar)) {
    data.solar = null;
  }

  const securePdfUrl = buildSecurePdfUrl(data?.public_token);
  if (data && 'pdf_storage_path' in data && data.pdf_storage_path && securePdfUrl) {
    data.pdf_url = securePdfUrl;
  }

  return data as Proposal;
}

async function removeProposal(id: string) {
  const { error } = await supabase
    .from('proposals')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

const proposalOperations = createProposalOperations({
  getById: getProposalById,
  persist: persistProposalBundle,
  remove: removeProposal,
});

export const proposalService = {
  getProposals,
  getProposalById,
  createProposal: proposalOperations.createProposal,
  updateProposal: proposalOperations.updateProposal,
  duplicateProposal: proposalOperations.duplicateProposal,
  deleteProposal: proposalOperations.deleteProposal,
};
