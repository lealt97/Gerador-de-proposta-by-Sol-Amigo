import type { CommercialPlanCode } from './planCatalog';

export const MEBIBYTE = 1024 * 1024;
export const GIBIBYTE = 1024 * MEBIBYTE;
export const PLAN_USAGE_WARNING_PERCENT = 80;

export interface PlanLimits {
  proposalsPerMonth: number;
  users: number;
  storageBytes: number;
}

export const FREE_PLAN_LIMITS: PlanLimits = {
  proposalsPerMonth: 5,
  users: 1,
  storageBytes: 250 * MEBIBYTE,
};

export const PRO_PLAN_LIMITS: PlanLimits = {
  proposalsPerMonth: 100,
  users: 5,
  storageBytes: 10 * GIBIBYTE,
};

export const PLAN_LIMITS: Readonly<Record<CommercialPlanCode, PlanLimits>> = {
  free: FREE_PLAN_LIMITS,
  pro: PRO_PLAN_LIMITS,
};

export function getPlanLimits(planCode: CommercialPlanCode): PlanLimits {
  return PLAN_LIMITS[planCode];
}

export function getRemainingQuota(used: number, limit: number): number {
  if (!Number.isFinite(used) || used < 0) {
    throw new RangeError('O uso precisa ser um número finito maior ou igual a zero.');
  }

  if (!Number.isFinite(limit) || limit < 0) {
    throw new RangeError('O limite precisa ser um número finito maior ou igual a zero.');
  }

  return Math.max(0, limit - used);
}

export function hasQuotaForIncrement(used: number, increment: number, limit: number): boolean {
  if (!Number.isFinite(increment) || increment < 0) {
    throw new RangeError('O incremento precisa ser um número finito maior ou igual a zero.');
  }

  return getRemainingQuota(used, limit) >= increment;
}

export function getUsagePercent(used: number, limit: number): number {
  if (limit === 0) return used === 0 ? 0 : 100;
  return Math.min(100, Math.max(0, (used / limit) * 100));
}

export function shouldWarnAboutUsage(used: number, limit: number): boolean {
  return getUsagePercent(used, limit) >= PLAN_USAGE_WARNING_PERCENT;
}
