export interface SolarKit {
  id: string;
  user_id: string;
  name: string;
  supplier: string | null;
  module_brand: string | null;
  module_model: string | null;
  module_power_w: number;
  module_quantity: number;
  inverter_brand: string | null;
  inverter_model: string | null;
  inverter_power_kw: number | null;
  structure_type: string | null;
  kit_power_kwp: number;
  cost_price: number;
  sale_price: number | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SolarKitFormValues {
  name: string;
  supplier?: string | null;
  module_brand?: string | null;
  module_model?: string | null;
  module_power_w: number;
  module_quantity: number;
  inverter_brand?: string | null;
  inverter_model?: string | null;
  inverter_power_kw?: number | null;
  structure_type?: string | null;
  cost_price: number;
  sale_price?: number | null;
  active: boolean;
  notes?: string | null;
}

export interface SolarKitSnapshot {
  id: string;
  name: string;
  supplier: string | null;
  module_brand: string | null;
  module_model: string | null;
  module_power_w: number;
  module_quantity: number;
  inverter_brand: string | null;
  inverter_model: string | null;
  inverter_power_kw: number | null;
  structure_type: string | null;
  kit_power_kwp: number;
  cost_price: number;
  sale_price: number | null;
}

export function buildSolarKitSnapshot(kit: SolarKit): SolarKitSnapshot {
  return {
    id: kit.id,
    name: kit.name,
    supplier: kit.supplier,
    module_brand: kit.module_brand,
    module_model: kit.module_model,
    module_power_w: kit.module_power_w,
    module_quantity: kit.module_quantity,
    inverter_brand: kit.inverter_brand,
    inverter_model: kit.inverter_model,
    inverter_power_kw: kit.inverter_power_kw,
    structure_type: kit.structure_type,
    kit_power_kwp: kit.kit_power_kwp,
    cost_price: kit.cost_price,
    sale_price: kit.sale_price,
  };
}
