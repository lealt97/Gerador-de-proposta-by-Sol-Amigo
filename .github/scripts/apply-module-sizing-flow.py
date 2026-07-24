from pathlib import Path


VIEW_PATH = Path('src/pages/propostas/ProfessionalSizingCalculatorView.tsx')
TEST_PATH = Path('tests/generation-input-only.test.ts')


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise SystemExit(f'Marcador não encontrado: {label}')
    return source.replace(old, new, 1)


source = VIEW_PATH.read_text(encoding='utf-8')

if "from '../../lib/calculations/moduleSizing'" not in source:
    import_marker = "} from '../../lib/calculations/professionalSizing';\n"
    module_import = (
        "import {\n"
        "  calculateModuleQuantity,\n"
        "  calculateModuleSizing,\n"
        "  type ModuleSizingResult,\n"
        "} from '../../lib/calculations/moduleSizing';\n"
    )
    source = replace_once(source, import_marker, import_marker + module_import, 'import profissional')

if 'const [modulePowerW' not in source:
    state_marker = "  const [generationIncreasePercent, setGenerationIncreasePercent] = useState('0');\n"
    module_states = (
        "\n"
        "  const [modulePowerW, setModulePowerW] = useState('275');\n"
        "  const [moduleWidthM, setModuleWidthM] = useState('');\n"
        "  const [moduleHeightM, setModuleHeightM] = useState('');\n"
        "  const [roofWidthM, setRoofWidthM] = useState('');\n"
        "  const [roofHeightM, setRoofHeightM] = useState('');\n"
    )
    source = replace_once(source, state_marker, state_marker + module_states, 'estado da geração adicional')

if 'const moduleFields = [' not in source:
    validation_marker = (
        "      if (!Number.isFinite(parsedGenerationIncrease) || parsedGenerationIncrease < 0 || parsedGenerationIncrease > 100) {\n"
        "        toast.error('Informe uma geração adicional entre 0% e 100%.');\n"
        "        return false;\n"
        "      }\n"
    )
    validation_block = (
        "\n"
        "      const moduleFields = [\n"
        "        { value: parseNumber(modulePowerW), message: 'Informe a potência do módulo em Wp.' },\n"
        "        { value: parseNumber(moduleWidthM), message: 'Informe a largura do módulo em metros.' },\n"
        "        { value: parseNumber(moduleHeightM), message: 'Informe a altura do módulo em metros.' },\n"
        "        { value: parseNumber(roofWidthM), message: 'Informe a largura útil do telhado em metros.' },\n"
        "        { value: parseNumber(roofHeightM), message: 'Informe a altura útil do telhado em metros.' },\n"
        "      ];\n"
        "      const invalidModuleField = moduleFields.find((field) => !Number.isFinite(field.value) || field.value <= 0);\n"
        "      if (invalidModuleField) {\n"
        "        toast.error(invalidModuleField.message);\n"
        "        return false;\n"
        "      }\n"
    )
    source = replace_once(source, validation_marker, validation_marker + validation_block, 'validação da geração')

if 'const moduleQuantity = useMemo' not in source:
    result_marker = (
        "  const result = calculation.result;\n"
        "  const hasCalculation = Boolean(result);\n"
    )
    result_block = (
        "  const result = calculation.result;\n"
        "  const moduleQuantity = useMemo(() => {\n"
        "    const parsedModulePower = parseNumber(modulePowerW);\n"
        "    if (!result || !Number.isFinite(parsedModulePower) || parsedModulePower <= 0) return null;\n"
        "\n"
        "    try {\n"
        "      return calculateModuleQuantity(result.requiredPowerKwp, parsedModulePower);\n"
        "    } catch {\n"
        "      return null;\n"
        "    }\n"
        "  }, [modulePowerW, result]);\n"
        "\n"
        "  const moduleSizing = useMemo<{ result: ModuleSizingResult | null; error: string | null }>(() => {\n"
        "    if (!result) return { result: null, error: null };\n"
        "\n"
        "    const values = {\n"
        "      modulePowerW: parseNumber(modulePowerW),\n"
        "      moduleWidthM: parseNumber(moduleWidthM),\n"
        "      moduleHeightM: parseNumber(moduleHeightM),\n"
        "      roofWidthM: parseNumber(roofWidthM),\n"
        "      roofHeightM: parseNumber(roofHeightM),\n"
        "    };\n"
        "\n"
        "    if (Object.values(values).some((value) => !Number.isFinite(value) || value <= 0)) {\n"
        "      return { result: null, error: null };\n"
        "    }\n"
        "\n"
        "    try {\n"
        "      return {\n"
        "        result: calculateModuleSizing({\n"
        "          requiredPowerKwp: result.requiredPowerKwp,\n"
        "          ...values,\n"
        "        }),\n"
        "        error: null,\n"
        "      };\n"
        "    } catch (error) {\n"
        "      return {\n"
        "        result: null,\n"
        "        error: error instanceof Error ? error.message : 'Não foi possível calcular a ocupação do telhado.',\n"
        "      };\n"
        "    }\n"
        "  }, [moduleHeightM, modulePowerW, moduleWidthM, result, roofHeightM, roofWidthM]);\n"
        "\n"
        "  const hasCalculation = Boolean(result);\n"
    )
    source = replace_once(source, result_marker, result_block, 'resultado principal')

if 'Quantidade de módulos e área do telhado' not in source:
    summary_marker = (
        "                {result && (\n"
        "                  <div className=\"grid gap-4 sm:grid-cols-2 xl:grid-cols-4\">\n"
        "                    <Summary label=\"Consumo compensável\" value={`${number.format(result.compensableMonthlyConsumptionKwh)} kWh/mês`} />\n"
        "                    <Summary label=\"Geração adicional\" value={`${number.format(result.generationIncreasePercent)}%`} />\n"
        "                    <Summary label=\"Meta de geração\" value={`${number.format(result.targetMonthlyGenerationKwh)} kWh/mês`} />\n"
        "                    <Summary label=\"Potência necessária\" value={`${number.format(result.requiredPowerKwp)} kWp`} highlight />\n"
        "                  </div>\n"
        "                )}\n"
    )
    module_ui = summary_marker + (
        "\n"
        "                <div className=\"rounded-xl border border-brand-border bg-brand-gray/30 p-5\">\n"
        "                  <div>\n"
        "                    <h3 className=\"font-bold text-brand-dark\">Quantidade de módulos e área do telhado</h3>\n"
        "                    <p className=\"mt-1 text-sm leading-6 text-slate-500\">\n"
        "                      A quantidade é arredondada para cima. A verificação compara a área total dos módulos com a área útil informada.\n"
        "                    </p>\n"
        "                  </div>\n"
        "\n"
        "                  <div className=\"mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3\">\n"
        "                    <Field\n"
        "                      label=\"Potência do módulo\"\n"
        "                      value={modulePowerW}\n"
        "                      onChange={setModulePowerW}\n"
        "                      suffix=\"Wp\"\n"
        "                      min={1}\n"
        "                      step=\"1\"\n"
        "                      helper=\"Com 275 Wp e potência necessária de 4,556 kWp, o resultado é 17 módulos.\"\n"
        "                    />\n"
        "                    <Field label=\"Largura do módulo\" value={moduleWidthM} onChange={setModuleWidthM} suffix=\"m\" min={0.01} step=\"0.001\" />\n"
        "                    <Field label=\"Altura do módulo\" value={moduleHeightM} onChange={setModuleHeightM} suffix=\"m\" min={0.01} step=\"0.001\" />\n"
        "                    <Field label=\"Largura útil do telhado\" value={roofWidthM} onChange={setRoofWidthM} suffix=\"m\" min={0.01} step=\"0.01\" />\n"
        "                    <Field label=\"Altura útil do telhado\" value={roofHeightM} onChange={setRoofHeightM} suffix=\"m\" min={0.01} step=\"0.01\" />\n"
        "                  </div>\n"
        "\n"
        "                  {result && moduleQuantity != null && (\n"
        "                    <div className=\"mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4\">\n"
        "                      <Summary label=\"Quantidade de módulos\" value={`${moduleQuantity} módulos`} highlight />\n"
        "                      <Summary label=\"Potência instalada\" value={`${number.format((moduleQuantity * parseNumber(modulePowerW)) / 1000)} kWp`} />\n"
        "                      {moduleSizing.result && (\n"
        "                        <>\n"
        "                          <Summary label=\"Área por módulo\" value={`${number.format(moduleSizing.result.moduleAreaM2)} m²`} />\n"
        "                          <Summary label=\"Área total dos módulos\" value={`${number.format(moduleSizing.result.totalModuleAreaM2)} m²`} />\n"
        "                          <Summary label=\"Área útil do telhado\" value={`${number.format(moduleSizing.result.roofAreaM2)} m²`} />\n"
        "                          <Summary label=\"Saldo de área\" value={`${number.format(moduleSizing.result.availableAreaBalanceM2)} m²`} />\n"
        "                        </>\n"
        "                      )}\n"
        "                    </div>\n"
        "                  )}\n"
        "\n"
        "                  {moduleSizing.error && (\n"
        "                    <div className=\"mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700\">\n"
        "                      {moduleSizing.error}\n"
        "                    </div>\n"
        "                  )}\n"
        "\n"
        "                  {moduleSizing.result && (\n"
        "                    <div className={`mt-5 flex items-start gap-3 rounded-xl border p-4 ${\n"
        "                      moduleSizing.result.modulesFitRoof\n"
        "                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'\n"
        "                        : 'border-red-200 bg-red-50 text-red-700'\n"
        "                    }`}>\n"
        "                      {moduleSizing.result.modulesFitRoof ? (\n"
        "                        <CheckCircle2 className=\"mt-0.5 h-5 w-5 shrink-0\" />\n"
        "                      ) : (\n"
        "                        <AlertTriangle className=\"mt-0.5 h-5 w-5 shrink-0\" />\n"
        "                      )}\n"
        "                      <div>\n"
        "                        <p className=\"font-bold\">\n"
        "                          {moduleSizing.result.modulesFitRoof\n"
        "                            ? 'Os módulos cabem na área útil do telhado'\n"
        "                            : 'Os módulos não cabem na área útil do telhado'}\n"
        "                        </p>\n"
        "                        <p className=\"mt-1 text-xs leading-5 opacity-80\">\n"
        "                          Estimativa por área. Recuos, obstáculos, orientação e espaçamento devem ser verificados no projeto executivo.\n"
        "                        </p>\n"
        "                      </div>\n"
        "                    </div>\n"
        "                  )}\n"
        "                </div>\n"
    )
    source = replace_once(source, summary_marker, module_ui, 'resumo da etapa HSP')

if 'moduleSizing={moduleSizing.result}' not in source:
    preview_call_marker = (
        "            generationIncreasePercent={generationIncreasePercent}\n"
        "          />\n"
    )
    preview_call = (
        "            generationIncreasePercent={generationIncreasePercent}\n"
        "            moduleQuantity={moduleQuantity}\n"
        "            moduleSizing={moduleSizing.result}\n"
        "          />\n"
    )
    source = replace_once(source, preview_call_marker, preview_call, 'chamada do resumo lateral')

preview_section = source.split('function SizingPreview', 1)[-1]
if '  moduleSizing,' not in preview_section[:500]:
    signature_marker = (
        "  generationIncreasePercent,\n"
        "}: {\n"
    )
    signature = (
        "  generationIncreasePercent,\n"
        "  moduleQuantity,\n"
        "  moduleSizing,\n"
        "}: {\n"
    )
    source = replace_once(source, signature_marker, signature, 'assinatura do resumo lateral')

if '  moduleSizing: ModuleSizingResult | null;' not in source:
    type_marker = (
        "  generationIncreasePercent: string;\n"
        "}) {\n"
    )
    type_block = (
        "  generationIncreasePercent: string;\n"
        "  moduleQuantity: number | null;\n"
        "  moduleSizing: ModuleSizingResult | null;\n"
        "}) {\n"
    )
    source = replace_once(source, type_marker, type_block, 'tipos do resumo lateral')

preview_section = source.split('function SizingPreview', 1)[-1]
if 'label="Quantidade de módulos"' not in preview_section:
    power_row = (
        "            <PreviewRow label=\"Potência necessária\" value={result ? `${number.format(result.requiredPowerKwp)} kWp` : 'Aguardando HSP'} highlight />\n"
    )
    module_rows = power_row + (
        "            {moduleQuantity != null && <PreviewRow label=\"Quantidade de módulos\" value={`${moduleQuantity} módulos`} />}\n"
        "            {moduleSizing && (\n"
        "              <>\n"
        "                <PreviewRow label=\"Área dos módulos\" value={`${number.format(moduleSizing.totalModuleAreaM2)} m²`} />\n"
        "                <PreviewRow label=\"Área útil do telhado\" value={`${number.format(moduleSizing.roofAreaM2)} m²`} />\n"
        "                <PreviewRow label=\"Status do telhado\" value={moduleSizing.modulesFitRoof ? 'Cabe' : 'Não cabe'} highlight />\n"
        "              </>\n"
        "            )}\n"
    )
    source = replace_once(source, power_row, module_rows, 'potência necessária no resumo')

VIEW_PATH.write_text(source, encoding='utf-8')

tests = TEST_PATH.read_text(encoding='utf-8')
if 'o fluxo calcula quantidade de módulos' not in tests:
    tests += (
        "\n\n"
        "test('o fluxo calcula quantidade de módulos, áreas e status do telhado', async () => {\n"
        "  const calculator = await readFile(CALCULATOR_VIEW, 'utf8');\n"
        "\n"
        "  assert.match(calculator, /calculateModuleQuantity/);\n"
        "  assert.match(calculator, /calculateModuleSizing/);\n"
        "  assert.match(calculator, /label=\"Potência do módulo\"/);\n"
        "  assert.match(calculator, /label=\"Largura do módulo\"/);\n"
        "  assert.match(calculator, /label=\"Altura do módulo\"/);\n"
        "  assert.match(calculator, /label=\"Largura útil do telhado\"/);\n"
        "  assert.match(calculator, /label=\"Altura útil do telhado\"/);\n"
        "  assert.match(calculator, /Quantidade de módulos e área do telhado/);\n"
        "  assert.match(calculator, /modulesFitRoof/);\n"
        "  assert.match(calculator, /Os módulos cabem na área útil do telhado/);\n"
        "  assert.match(calculator, /Os módulos não cabem na área útil do telhado/);\n"
        "});\n"
    )
    TEST_PATH.write_text(tests, encoding='utf-8')
