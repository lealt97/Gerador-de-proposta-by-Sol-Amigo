from pathlib import Path

repo = Path('.')
calculator_path = repo / 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx'
calculator = calculator_path.read_text(encoding='utf-8')

oversizing_lib = """export type DcAcOversizingStatus = 'dc_below_ac' | 'reference' | 'above_reference';

export type DcAcOversizingResult = {
  dcPowerKwp: number;
  acPowerKw: number;
  dcAcRatio: number;
  oversizingPercent: number;
  status: DcAcOversizingStatus;
  statusLabel: string;
  guidance: string;
};

const round = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export function calculateDcAcOversizing(
  dcPowerKwp: number,
  acPowerKw: number,
): DcAcOversizingResult {
  if (!Number.isFinite(dcPowerKwp) || dcPowerKwp <= 0) {
    throw new Error('A potência DC dos módulos deve ser maior que zero.');
  }

  if (!Number.isFinite(acPowerKw) || acPowerKw <= 0) {
    throw new Error('A potência AC do inversor deve ser maior que zero.');
  }

  const dcAcRatio = dcPowerKwp / acPowerKw;
  const oversizingPercent = Math.max((dcAcRatio - 1) * 100, 0);

  if (dcAcRatio < 1) {
    return {
      dcPowerKwp: round(dcPowerKwp, 3),
      acPowerKw: round(acPowerKw, 3),
      dcAcRatio: round(dcAcRatio, 3),
      oversizingPercent: 0,
      status: 'dc_below_ac',
      statusLabel: 'Sem oversizing',
      guidance: 'A potência DC dos módulos está abaixo da potência AC do inversor. Revise se o conjunto está adequado ao objetivo do projeto.',
    };
  }

  if (dcAcRatio <= 1.2) {
    return {
      dcPowerKwp: round(dcPowerKwp, 3),
      acPowerKw: round(acPowerKw, 3),
      dcAcRatio: round(dcAcRatio, 3),
      oversizingPercent: round(oversizingPercent, 1),
      status: 'reference',
      statusLabel: 'Até a referência de 1,20',
      guidance: 'A relação DC/AC está até 1,20. Ainda é necessário confirmar potência FV máxima, tensão, corrente e faixa MPPT no datasheet do inversor.',
    };
  }

  return {
    dcPowerKwp: round(dcPowerKwp, 3),
    acPowerKw: round(acPowerKw, 3),
    dcAcRatio: round(dcAcRatio, 3),
    oversizingPercent: round(oversizingPercent, 1),
    status: 'above_reference',
    statusLabel: 'Acima da referência de 1,20',
    guidance: 'A relação DC/AC está acima de 1,20. Revise cuidadosamente a potência FV máxima, tensão, corrente, faixa MPPT e as condições de garantia do inversor.',
  };
}
"""

oversizing_test = """import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateDcAcOversizing } from '../src/lib/calculations/oversizing';

test('calcula relação DC/AC e oversizing de 20%', () => {
  const result = calculateDcAcOversizing(6, 5);

  assert.equal(result.dcAcRatio, 1.2);
  assert.equal(result.oversizingPercent, 20);
  assert.equal(result.status, 'reference');
});

test('sinaliza relação acima da referência de 1,20', () => {
  const result = calculateDcAcOversizing(6.6, 5);

  assert.equal(result.dcAcRatio, 1.32);
  assert.equal(result.oversizingPercent, 32);
  assert.equal(result.status, 'above_reference');
});

test('não apresenta oversizing quando a potência DC é menor que a AC', () => {
  const result = calculateDcAcOversizing(4, 5);

  assert.equal(result.dcAcRatio, 0.8);
  assert.equal(result.oversizingPercent, 0);
  assert.equal(result.status, 'dc_below_ac');
});

test('rejeita potências inválidas', () => {
  assert.throws(() => calculateDcAcOversizing(0, 5), /potência DC/);
  assert.throws(() => calculateDcAcOversizing(5, 0), /potência AC/);
});
"""

integration_test = """import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';

test('calculadora apresenta oversizing após a seleção do kit', async () => {
  const source = await readFile(CALCULATOR, 'utf8');

  assert.match(source, /calculateDcAcOversizing/);
  assert.match(source, /selectedKitOversizing/);
  assert.match(source, /Relação DC\/AC/);
  assert.match(source, /Oversizing/);
  assert.match(source, /Potência AC do inversor/);
  assert.match(source, /datasheet do inversor/);
});
"""

(repo / 'src/lib/calculations').mkdir(parents=True, exist_ok=True)
(repo / 'tests').mkdir(parents=True, exist_ok=True)
(repo / 'src/lib/calculations/oversizing.ts').write_text(oversizing_lib, encoding='utf-8')
(repo / 'tests/oversizing.test.ts').write_text(oversizing_test, encoding='utf-8')
(repo / 'tests/oversizing-calculator-integration.test.ts').write_text(integration_test, encoding='utf-8')

replacements = [
    (
        "} from '../../lib/calculations/moduleSizing';\nimport type { PaybackResult } from '../../lib/calculations/payback';",
        "} from '../../lib/calculations/moduleSizing';\nimport { calculateDcAcOversizing } from '../../lib/calculations/oversizing';\nimport type { PaybackResult } from '../../lib/calculations/payback';",
    ),
    (
        "  const selectedKit = useMemo(\n    () => kits.find((kit) => kit.id === selectedKitId) ?? null,\n    [kits, selectedKitId],\n  );\n\n  const consumptionModeInput",
        "  const selectedKit = useMemo(\n    () => kits.find((kit) => kit.id === selectedKitId) ?? null,\n    [kits, selectedKitId],\n  );\n\n  const selectedKitOversizing = useMemo(() => {\n    const inverterPowerKw = selectedKit?.inverter_power_kw;\n    if (!selectedKit || inverterPowerKw == null || inverterPowerKw <= 0) return null;\n\n    try {\n      return calculateDcAcOversizing(selectedKit.kit_power_kwp, inverterPowerKw);\n    } catch {\n      return null;\n    }\n  }, [selectedKit]);\n\n  const consumptionModeInput",
    ),
    (
        "                            <Detail label=\"Inversor\" value={[selectedKit.inverter_brand, selectedKit.inverter_model].filter(Boolean).join(' ') || 'Não informado'} />\n",
        "                            <Detail label=\"Inversor\" value={[selectedKit.inverter_brand, selectedKit.inverter_model].filter(Boolean).join(' ') || 'Não informado'} />\n                            <Detail label=\"Potência AC do inversor\" value={selectedKit.inverter_power_kw && selectedKit.inverter_power_kw > 0 ? `${number.format(selectedKit.inverter_power_kw)} kW` : 'Não informada'} />\n",
    ),
    (
        "                      </Card>\n                    </div>\n\n                    <div className=\"grid gap-4 sm:grid-cols-2 xl:grid-cols-4\">\n                      <Summary label=\"Potência necessária\"",
        "                      </Card>\n                    </div>\n\n                    {selectedKitOversizing ? (\n                      <div className={`rounded-xl border p-5 ${\n                        selectedKitOversizing.status === 'reference'\n                          ? 'border-emerald-200 bg-emerald-50/60'\n                          : selectedKitOversizing.status === 'above_reference'\n                            ? 'border-amber-200 bg-amber-50/70'\n                            : 'border-brand-blue/20 bg-brand-blue/5'\n                      }`}>\n                        <div className=\"flex items-start gap-3\">\n                          {selectedKitOversizing.status === 'reference' ? (\n                            <CheckCircle2 className=\"mt-0.5 h-6 w-6 shrink-0 text-emerald-600\" />\n                          ) : selectedKitOversizing.status === 'above_reference' ? (\n                            <AlertTriangle className=\"mt-0.5 h-6 w-6 shrink-0 text-amber-600\" />\n                          ) : (\n                            <Gauge className=\"mt-0.5 h-6 w-6 shrink-0 text-brand-blue\" />\n                          )}\n                          <div className=\"min-w-0\">\n                            <p className=\"text-xs font-bold uppercase tracking-wider text-brand-blue\">Oversizing DC/AC</p>\n                            <h3 className=\"mt-1 text-lg font-bold text-brand-dark\">{selectedKitOversizing.statusLabel}</h3>\n                            <p className=\"mt-1 text-sm leading-6 text-slate-600\">{selectedKitOversizing.guidance}</p>\n                          </div>\n                        </div>\n                        <div className=\"mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4\">\n                          <Summary label=\"Potência DC dos módulos\" value={`${number.format(selectedKitOversizing.dcPowerKwp)} kWp`} />\n                          <Summary label=\"Potência AC do inversor\" value={`${number.format(selectedKitOversizing.acPowerKw)} kW`} />\n                          <Summary label=\"Relação DC/AC\" value={number.format(selectedKitOversizing.dcAcRatio)} />\n                          <Summary label=\"Oversizing\" value={`${number.format(selectedKitOversizing.oversizingPercent)}%`} highlight />\n                        </div>\n                      </div>\n                    ) : (\n                      <div className=\"flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-amber-800\">\n                        <AlertTriangle className=\"mt-0.5 h-6 w-6 shrink-0\" />\n                        <div>\n                          <p className=\"font-bold\">Potência AC do inversor não informada</p>\n                          <p className=\"mt-1 text-sm leading-6\">Cadastre a potência do inversor no catálogo do kit para calcular a relação DC/AC e o oversizing.</p>\n                        </div>\n                      </div>\n                    )}\n\n                    <div className=\"grid gap-4 sm:grid-cols-2 xl:grid-cols-4\">\n                      <Summary label=\"Potência necessária\"",
    ),
    (
        "                            <PreviewRow label=\"Cobertura da meta\" value={`${number.format(result.selectedKitCoveragePercent ?? 0)}%`} />\n",
        "                            <PreviewRow label=\"Cobertura da meta\" value={`${number.format(result.selectedKitCoveragePercent ?? 0)}%`} />\n                            {selectedKitOversizing && (\n                              <>\n                                <PreviewRow label=\"Relação DC/AC\" value={number.format(selectedKitOversizing.dcAcRatio)} />\n                                <PreviewRow label=\"Oversizing\" value={`${number.format(selectedKitOversizing.oversizingPercent)}%`} />\n                              </>\n                            )}\n",
    ),
]

for old, new in replacements:
    if old not in calculator:
        raise SystemExit(f'Trecho esperado não encontrado:\n{old}')
    calculator = calculator.replace(old, new, 1)

calculator_path.write_text(calculator, encoding='utf-8')
