import type { ProposalFormValues } from '../validations/proposal.schema';
import type { Proposal } from '../../types/proposal';

export type PersistProposalBundleInput = {
  proposalId: string | null;
  expectedRevision: number | null;
  values: ProposalFormValues;
  eventType: string | null;
  eventDescription: string | null;
};

export interface ProposalRepository {
  getById(id: string): Promise<Proposal>;
  persist(input: PersistProposalBundleInput): Promise<Proposal>;
  remove(id: string): Promise<void>;
}

const mutationQueues = new Map<string, Promise<unknown>>();

function enqueueProposalMutation<T>(proposalId: string, task: () => Promise<T>): Promise<T> {
  const previous = mutationQueues.get(proposalId) || Promise.resolve();
  const next = previous.catch(() => undefined).then(task);

  mutationQueues.set(proposalId, next);
  void next.then(
    () => {
      if (mutationQueues.get(proposalId) === next) mutationQueues.delete(proposalId);
    },
    () => {
      if (mutationQueues.get(proposalId) === next) mutationQueues.delete(proposalId);
    },
  );

  return next;
}

export function formatProposalNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function proposalToFormValues(proposal: Proposal): ProposalFormValues {
  const solar = proposal.solar;
  const otherCosts = formatProposalNumber(proposal.other_costs) || 0;

  return {
    client_id: proposal.client_id,
    title: proposal.title || '',
    consumption_source: proposal.consumption_source || 'average',
    history: (proposal.history || []) as Array<string | number>,
    estimated_daily_consumption: proposal.estimated_daily_consumption ?? '',
    monthly_consumption_kwh: proposal.monthly_consumption_kwh ?? '',
    bill_amount: proposal.bill_amount ?? '',
    loads: (proposal.loads || []).map((load) => ({
      id: load.id,
      equipment_name: load.equipment_name,
      power_watts: load.power_watts,
      quantity: load.quantity,
      hours_per_day: load.hours_per_day,
      daily_consumption: load.daily_consumption,
    })),
    system_type: proposal.system_type || 'on_grid',
    cep: solar?.cep || '',
    hsp: solar?.hsp ?? '',
    panel_power_w: solar?.panel_power_w ?? '',
    yield_factor: solar?.yield_factor ?? 0.8,
    generation_target_percent: solar?.generation_target_percent ?? 100,
    oversizing: solar?.oversizing ?? 1.2,
    energy_tariff: solar?.energy_tariff ?? proposal.energy_tariff ?? '',
    battery_capacity_kwh: proposal.battery_capacity_kwh ?? '',
    usable_battery_capacity_kwh: proposal.usable_battery_capacity_kwh ?? '',
    backup_power_kw: proposal.backup_power_kw ?? '',
    autonomy_hours: proposal.autonomy_hours ?? '',
    essential_loads_description: proposal.essential_loads_description || '',
    selected_solar_kit_id: proposal.selected_solar_kit_id || '',
    solar_kit_snapshot: proposal.solar_kit_snapshot || null,
    roof_type: proposal.roof_type || '',
    roof_area_m2: proposal.roof_area_m2 ?? '',
    roof_image_url: proposal.roof_image_url || '',
    module_width_m: proposal.module_width_m ?? '',
    module_height_m: proposal.module_height_m ?? '',
    roof_layout_json: proposal.roof_layout_json || undefined,
    kit_cost: proposal.kit_cost ?? '',
    labor_cost: proposal.labor_cost ?? '',
    fixed_costs: proposal.fixed_costs ?? '',
    freight_cost: proposal.freight_cost ?? '',
    taxes: proposal.taxes ?? '',
    commission: proposal.commission ?? '',
    other_costs: otherCosts || '',
    additional_costs: otherCosts > 0
      ? [{ description: 'Custos adicionais', amount: otherCosts }]
      : [],
    margin_percentage: proposal.margin_percentage ?? '',
    discount_percentage: proposal.discount_percentage ?? '',
  };
}

export function normalizeProposalCreateValues(proposal: ProposalFormValues): ProposalFormValues {
  const possiblePersistedProposal = proposal as ProposalFormValues & Partial<Proposal>;
  if ('user_id' in possiblePersistedProposal || 'solar' in possiblePersistedProposal) {
    return proposalToFormValues(possiblePersistedProposal as Proposal);
  }
  return proposal;
}

export function mergeProposalValues(
  base: ProposalFormValues,
  updates: Partial<ProposalFormValues>,
): ProposalFormValues {
  return {
    ...base,
    ...updates,
    history: updates.history !== undefined ? updates.history : base.history,
    loads: updates.loads !== undefined ? updates.loads : base.loads,
    additional_costs: updates.additional_costs !== undefined
      ? updates.additional_costs
      : base.additional_costs,
    solar_kit_snapshot: updates.solar_kit_snapshot !== undefined
      ? updates.solar_kit_snapshot
      : base.solar_kit_snapshot,
    roof_layout_json: updates.roof_layout_json !== undefined
      ? updates.roof_layout_json
      : base.roof_layout_json,
  };
}

export function areProposalValuesEquivalent(left: unknown, right: unknown) {
  if (left === right) return true;

  const leftNumber = formatProposalNumber(left);
  const rightNumber = formatProposalNumber(right);
  if (leftNumber !== null && rightNumber !== null) return leftNumber === rightNumber;

  try {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
  } catch {
    return false;
  }
}

export function extractChangedProposalUpdates(
  base: ProposalFormValues,
  updates: Partial<ProposalFormValues>,
): Partial<ProposalFormValues> {
  const changed: Partial<ProposalFormValues> = {};

  (Object.keys(updates) as Array<keyof ProposalFormValues>).forEach((key) => {
    const nextValue = updates[key];
    if (!areProposalValuesEquivalent(base[key], nextValue)) {
      (changed as Record<string, unknown>)[key] = nextValue;
    }
  });

  return changed;
}

export function isProposalRevisionConflict(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === '40001'
    || String(candidate.message || '').includes('alterada em outra sessão');
}

export function createProposalOperations(repository: ProposalRepository) {
  const createProposal = async (
    proposal: ProposalFormValues,
    _userId: string,
    isDuplicate = false,
  ) => {
    const values = normalizeProposalCreateValues(proposal);
    return repository.persist({
      proposalId: null,
      expectedRevision: null,
      values,
      eventType: isDuplicate ? 'duplicated' : 'created',
      eventDescription: isDuplicate ? 'Proposta duplicada' : 'Proposta criada',
    });
  };

  const updateProposal = (id: string, updates: Partial<ProposalFormValues>) => {
    return enqueueProposalMutation(id, async () => {
      let current = await repository.getById(id);
      const originalValues = proposalToFormValues(current);
      const changedUpdates = extractChangedProposalUpdates(originalValues, updates);

      if (Object.keys(changedUpdates).length === 0) return current;

      let merged = mergeProposalValues(originalValues, changedUpdates);

      try {
        return await repository.persist({
          proposalId: id,
          expectedRevision: current.revision ?? 0,
          values: merged,
          eventType: null,
          eventDescription: null,
        });
      } catch (error) {
        if (!isProposalRevisionConflict(error)) throw error;

        current = await repository.getById(id);
        merged = mergeProposalValues(proposalToFormValues(current), changedUpdates);
        return repository.persist({
          proposalId: id,
          expectedRevision: current.revision ?? 0,
          values: merged,
          eventType: null,
          eventDescription: null,
        });
      }
    });
  };

  const duplicateProposal = async (sourceProposalId: string, userId: string) => {
    const source = await repository.getById(sourceProposalId);
    const values = proposalToFormValues(source);
    return createProposal(
      { ...values, title: `${source.title || 'Proposta'} (Cópia)` },
      userId,
      true,
    );
  };

  const deleteProposal = (id: string) => {
    return enqueueProposalMutation(id, () => repository.remove(id));
  };

  return {
    createProposal,
    updateProposal,
    duplicateProposal,
    deleteProposal,
  };
}
