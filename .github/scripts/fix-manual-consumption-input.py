from pathlib import Path

path = Path('src/pages/propostas/ProfessionalSizingCalculatorView.tsx')
source = path.read_text(encoding='utf-8')

replacements = [
    (
        "import { technicalNumber as number } from '../../lib/formatters/technicalNumber';\n",
        "import { technicalNumber as number } from '../../lib/formatters/technicalNumber';\nimport { parseConsumptionKwhInput } from '../../lib/formatters/parseConsumptionKwhInput';\n",
    ),
    (
        "  helper,\n  type = 'number',\n}: {",
        "  helper,\n  type = 'number',\n  inputMode,\n  onBlur,\n}: {",
    ),
    (
        "  helper?: string;\n  type?: 'number' | 'text';\n}) {",
        "  helper?: string;\n  type?: 'number' | 'text';\n  inputMode?: 'decimal' | 'numeric';\n  onBlur?: () => void;\n}) {",
    ),
    (
        "          onChange={(event) => onChange(event.target.value)}\n          className={suffix ? 'pr-20' : undefined}",
        "          inputMode={inputMode}\n          onChange={(event) => onChange(event.target.value)}\n          onBlur={onBlur}\n          className={suffix ? 'pr-20' : undefined}",
    ),
    (
        "  const [directAverageConsumption, setDirectAverageConsumption] = useState('');\n",
        "  const [directAverageConsumption, setDirectAverageConsumption] = useState('');\n  const [committedDirectAverageConsumption, setCommittedDirectAverageConsumption] = useState('');\n",
    ),
    (
        "    setDirectAverageConsumption(state.directAverageConsumption);\n",
        "    setDirectAverageConsumption(state.directAverageConsumption);\n    setCommittedDirectAverageConsumption(state.directAverageConsumption);\n",
    ),
    (
        "    directAverageMonthlyKwh: parseNumber(directAverageConsumption),\n    monthlyHistoryKwh: monthlyConsumption.map(parseNumber),",
        "    directAverageMonthlyKwh: parseConsumptionKwhInput(committedDirectAverageConsumption),\n    monthlyHistoryKwh: monthlyConsumption.map(parseConsumptionKwhInput),",
    ),
    (
        "  }), [consumptionMode, directAverageConsumption, loadSurvey, monthlyConsumption]);",
        "  }), [committedDirectAverageConsumption, consumptionMode, loadSurvey, monthlyConsumption]);",
    ),
    (
        "                        value={directAverageConsumption}\n                        onChange={setDirectAverageConsumption}\n                        suffix=\"kWh/mês\"\n                        min={0.01}\n                        helper=\"Use a média já calculada a partir da conta de energia ou de outro estudo confiável.\"",
        "                        value={directAverageConsumption}\n                        onChange={(value) => {\n                          setDirectAverageConsumption(value);\n                          setCommittedDirectAverageConsumption('');\n                        }}\n                        onBlur={() => setCommittedDirectAverageConsumption(directAverageConsumption)}\n                        type=\"text\"\n                        inputMode=\"decimal\"\n                        suffix=\"kWh/mês\"\n                        min={0.01}\n                        helper=\"Aceita 1200, 1.200 ou 1.200,50. O cálculo é atualizado quando você sai do campo.\"",
    ),
    (
        "                          onClick={() => setDirectAverageConsumption(String(selectedClient.avg_consumption_kwh))}\n",
        "                          onClick={() => {\n                            const clientAverage = String(selectedClient.avg_consumption_kwh);\n                            setDirectAverageConsumption(clientAverage);\n                            setCommittedDirectAverageConsumption(clientAverage);\n                          }}\n",
    ),
]

for old, new in replacements:
    if old not in source:
        raise SystemExit(f'Trecho esperado não encontrado:\n{old}')
    source = source.replace(old, new, 1)

path.write_text(source, encoding='utf-8')

regression_path = Path('tests/manual-average-consumption-regression.test.ts')
regression_path.write_text("""import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';

test('entrada manual de média não calcula com valores parciais e aceita formato brasileiro', async () => {
  const source = await readFile(CALCULATOR, 'utf8');

  assert.match(source, /committedDirectAverageConsumption/);
  assert.match(source, /parseConsumptionKwhInput\(committedDirectAverageConsumption\)/);
  assert.match(source, /monthlyConsumption\.map\(parseConsumptionKwhInput\)/);
  assert.match(source, /setCommittedDirectAverageConsumption\(''\)/);
  assert.match(source, /onBlur=\{\(\) => setCommittedDirectAverageConsumption\(directAverageConsumption\)\}/);
  assert.match(source, /type=\"text\"[\s\S]*inputMode=\"decimal\"/);
  assert.match(source, /setCommittedDirectAverageConsumption\(clientAverage\)/);
});
""", encoding='utf-8')
