import { supabase } from '../lib/supabase/client';
import { SolarKit, SolarKitFormValues, SolarSystemType } from '../types/solarKit';

const normalizeSystemType = (value?: SolarSystemType | string | null): SolarSystemType => {
  if (value === 'hybrid' || value === 'off_grid') return value;
  return 'on_grid';
};

const normalizeKitPayload = (kit: SolarKitFormValues) => {
  const systemType = normalizeSystemType(kit.system_type);
  const hasStorage = systemType === 'hybrid' || systemType === 'off_grid';

  return {
    name: kit.name.trim(),
    supplier: kit.supplier?.trim() || null,
    system_type: systemType,
    module_brand: kit.module_brand?.trim() || null,
    module_model: kit.module_model?.trim() || null,
    module_power_w: Number(kit.module_power_w) || 0,
    module_quantity: Number(kit.module_quantity) || 0,
    inverter_brand: kit.inverter_brand?.trim() || null,
    inverter_model: kit.inverter_model?.trim() || null,
    inverter_power_kw: kit.inverter_power_kw ? Number(kit.inverter_power_kw) : null,
    structure_type: kit.structure_type?.trim() || null,
    battery_brand: hasStorage ? kit.battery_brand?.trim() || null : null,
    battery_model: hasStorage ? kit.battery_model?.trim() || null : null,
    battery_capacity_kwh: hasStorage && kit.battery_capacity_kwh ? Number(kit.battery_capacity_kwh) : null,
    usable_battery_capacity_kwh: hasStorage && kit.usable_battery_capacity_kwh ? Number(kit.usable_battery_capacity_kwh) : null,
    battery_quantity: hasStorage && kit.battery_quantity ? Number(kit.battery_quantity) : null,
    backup_power_kw: hasStorage && kit.backup_power_kw ? Number(kit.backup_power_kw) : null,
    autonomy_hours: hasStorage && kit.autonomy_hours ? Number(kit.autonomy_hours) : null,
    essential_loads_description: hasStorage ? kit.essential_loads_description?.trim() || null : null,
    cost_price: Number(kit.cost_price) || 0,
    sale_price: kit.sale_price ? Number(kit.sale_price) : null,
    active: kit.active,
    notes: kit.notes?.trim() || null,
  };
};

export const solarKitService = {
  async getKits() {
    const { data, error } = await supabase
      .from('solar_kits')
      .select('*')
      .order('kit_power_kwp', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as SolarKit[];
  },

  async getActiveKits() {
    const { data, error } = await supabase
      .from('solar_kits')
      .select('*')
      .eq('active', true)
      .order('kit_power_kwp', { ascending: true });

    if (error) throw error;
    return data as SolarKit[];
  },

  async createKit(kit: SolarKitFormValues, userId: string) {
    const { data, error } = await supabase
      .from('solar_kits')
      .insert([{ ...normalizeKitPayload(kit), user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return data as SolarKit;
  },

  async updateKit(id: string, kit: SolarKitFormValues) {
    const { data, error } = await supabase
      .from('solar_kits')
      .update(normalizeKitPayload(kit))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SolarKit;
  },

  async duplicateKit(kit: SolarKit, userId: string) {
    const copy: SolarKitFormValues = {
      name: `${kit.name} (cópia)`,
      supplier: kit.supplier,
      system_type: kit.system_type || 'on_grid',
      module_brand: kit.module_brand,
      module_model: kit.module_model,
      module_power_w: kit.module_power_w,
      module_quantity: kit.module_quantity,
      inverter_brand: kit.inverter_brand,
      inverter_model: kit.inverter_model,
      inverter_power_kw: kit.inverter_power_kw,
      structure_type: kit.structure_type,
      battery_brand: kit.battery_brand,
      battery_model: kit.battery_model,
      battery_capacity_kwh: kit.battery_capacity_kwh,
      usable_battery_capacity_kwh: kit.usable_battery_capacity_kwh,
      battery_quantity: kit.battery_quantity,
      backup_power_kw: kit.backup_power_kw,
      autonomy_hours: kit.autonomy_hours,
      essential_loads_description: kit.essential_loads_description,
      cost_price: kit.cost_price,
      sale_price: kit.sale_price,
      active: kit.active,
      notes: kit.notes,
    };

    return this.createKit(copy, userId);
  },

  async deleteKit(id: string) {
    const { error } = await supabase
      .from('solar_kits')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async toggleStatus(id: string, active: boolean) {
    const { data, error } = await supabase
      .from('solar_kits')
      .update({ active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SolarKit;
  },

  async toggleKitStatus(id: string, active: boolean) {
    return this.toggleStatus(id, active);
  },

  recommendKit(kits: SolarKit[], requiredKwp: number, systemType: SolarSystemType = 'on_grid') {
    const normalizedSystemType = normalizeSystemType(systemType);
    const activeKits = kits
      .filter((kit) => kit.active && kit.kit_power_kwp > 0 && (kit.system_type || 'on_grid') === normalizedSystemType)
      .sort((a, b) => a.kit_power_kwp - b.kit_power_kwp);

    if (activeKits.length === 0 || requiredKwp <= 0) return null;

    const compatibleKit = activeKits.find((kit) => kit.kit_power_kwp >= requiredKwp);
    return compatibleKit || activeKits[activeKits.length - 1];
  },
};
