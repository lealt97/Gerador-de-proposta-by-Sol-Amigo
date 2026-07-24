const BRAZILIAN_THOUSANDS_PATTERN = /^[+-]?\d{1,3}(?:\.\d{3})+$/;
const VALID_NUMBER_PATTERN = /^[+-]?[\d.,]+$/;

/**
 * Converte entradas de consumo aceitando os formatos usados no Brasil.
 *
 * Exemplos:
 * - 1200       -> 1200
 * - 1.200      -> 1200
 * - 1.200,50   -> 1200.5
 * - 1200,50    -> 1200.5
 * - 1200.50    -> 1200.5
 */
export function parseConsumptionKwhInput(value: string) {
  const compact = value.trim().replace(/[\s\u00a0]/g, '');
  if (!compact || !VALID_NUMBER_PATTERN.test(compact)) return Number.NaN;

  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');
  let normalized = compact;

  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot
      ? compact.replace(/\./g, '').replace(',', '.')
      : compact.replace(/,/g, '');
  } else if (lastComma >= 0) {
    if ((compact.match(/,/g) || []).length > 1) return Number.NaN;
    normalized = compact.replace(',', '.');
  } else if (lastDot >= 0) {
    if (BRAZILIAN_THOUSANDS_PATTERN.test(compact)) {
      normalized = compact.replace(/\./g, '');
    } else if ((compact.match(/\./g) || []).length > 1) {
      return Number.NaN;
    }
  }

  return Number(normalized);
}
