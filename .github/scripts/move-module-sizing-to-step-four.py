from pathlib import Path


VIEW_PATH = Path('src/pages/propostas/ProfessionalSizingCalculatorView.tsx')
TEST_PATH = Path('tests/generation-input-only.test.ts')


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise SystemExit(f'Marcador não encontrado: {label}')
    return source.replace(old, new, 1)


view = VIEW_PATH.read_text(encoding='utf-8')

old_steps = """const STEPS = [
  { id: 'client', title: 'Cliente' },
  { id: 'consumption', title: 'Consumo' },
  { id: 'irradiation', title: 'HSP e meta de geração' },
  { id: 'kit', title: 'Kit e resultado' },
] as const;
"""
new_steps = """const STEPS = [
  { id: 'client', title: 'Cliente' },
  { id: 'consumption', title: 'Consumo' },
  { id: 'irradiation', title: 'HSP e meta de geração' },
  { id: 'modules', title: 'Quantidade de módulos e área do telhado' },
  { id: 'kit', title: 'Kit e resultado' },
] as const;
"""
if "id: 'modules'" not in view:
    view = replace_once(view, old_steps, new_steps, 'lista de etapas')

old_validation = """      if (!Number.isFinite(parsedGenerationIncrease) || parsedGenerationIncrease < 0 || parsedGenerationIncrease > 100) {
        toast.error('Informe uma geração adicional entre 0% e 100%.');
        return false;
      }

      const moduleFields = [
        { value: parseNumber(modulePowerW), message: 'Informe a potência do módulo em Wp.' },
        { value: parseNumber(moduleWidthM), message: 'Informe a largura do módulo em metros.' },
        { value: parseNumber(moduleHeightM), message: 'Informe a altura do módulo em metros.' },
        { value: parseNumber(roofWidthM), message: 'Informe a largura útil do telhado em metros.' },
        { value: parseNumber(roofHeightM), message: 'Informe a altura útil do telhado em metros.' },
      ];
      const invalidModuleField = moduleFields.find((field) => !Number.isFinite(field.value) || field.value <= 0);
      if (invalidModuleField) {
        toast.error(invalidModuleField.message);
        return false;
      }
    }

    if (currentStep === 3 && !selectedKit) {
"""
new_validation = """      if (!Number.isFinite(parsedGenerationIncrease) || parsedGenerationIncrease < 0 || parsedGenerationIncrease > 100) {
        toast.error('Informe uma geração adicional entre 0% e 100%.');
        return false;
      }
    }

    if (currentStep === 3) {
      const moduleFields = [
        { value: parseNumber(modulePowerW), message: 'Informe a potência do módulo em Wp.' },
        { value: parseNumber(moduleWidthM), message: 'Informe a largura do módulo em metros.' },
        { value: parseNumber(moduleHeightM), message: 'Informe a altura do módulo em metros.' },
        { value: parseNumber(roofWidthM), message: 'Informe a largura útil do telhado em metros.' },
        { value: parseNumber(roofHeightM), message: 'Informe a altura útil do telhado em metros.' },
      ];
      const invalidModuleField = moduleFields.find((field) => !Number.isFinite(field.value) || field.value <= 0);
      if (invalidModuleField) {
        toast.error(invalidModuleField.message);
        return false;
      }
    }

    if (currentStep === 4 && !selectedKit) {
"""
if 'if (currentStep === 4 && !selectedKit)' not in view:
    view = replace_once(view, old_validation, new_validation, 'validação das etapas 3, 4 e 5')

module_start = """                <div className="rounded-xl border border-brand-border bg-brand-gray/30 p-5">
                  <div>
                    <h3 className="font-bold text-brand-dark">Quantidade de módulos e área do telhado</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      A quantidade é arredondada para cima. A verificação compara a área total dos módulos com a área útil informada.
                    </p>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
"""
module_end_and_kit = """                </div>
              </section>
            )}

            {currentStep === 3 && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-brand-dark">Seleção do kit cadastrado</h2>
"""

if "{currentStep === 3 && (\n              <section className=\"space-y-6\">\n                <div>\n                  <h2 className=\"text-lg font-bold text-brand-dark\">Quantidade de módulos e área do telhado</h2>" not in view:
    start_index = view.find(module_start)
    if start_index == -1:
        raise SystemExit('Marcador do bloco de módulos não encontrado.')

    end_index = view.find(module_end_and_kit, start_index)
    if end_index == -1:
        raise SystemExit('Marcador do fim da aba de HSP não encontrado.')

    module_block = view[start_index:end_index + len('                </div>')]
    module_body = module_block.replace(module_start, '                <div className="rounded-xl border border-brand-border bg-brand-gray/30 p-5">\n                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">\n', 1)

    step_two_closing = """              </section>
            )}

"""
    new_step_four = """            {currentStep === 3 && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-brand-dark">Quantidade de módulos e área do telhado</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Informe a potência e as dimensões do módulo, além da área útil disponível no telhado.
                  </p>
                </div>

""" + module_body + """
              </section>
            )}

            {currentStep === 4 && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-brand-dark">Seleção do kit cadastrado</h2>
"""

    view = view[:start_index] + step_two_closing + new_step_four + view[end_index + len(module_end_and_kit):]

VIEW_PATH.write_text(view, encoding='utf-8')

tests = TEST_PATH.read_text(encoding='utf-8')
new_test = r'''

test('a quantidade de módulos e área do telhado ocupa a aba 4 separada', async () => {
  const calculator = await readFile(CALCULATOR_VIEW, 'utf8');

  assert.match(
    calculator,
    /id: 'irradiation'[\s\S]*id: 'modules', title: 'Quantidade de módulos e área do telhado'[\s\S]*id: 'kit'/,
  );
  assert.match(
    calculator,
    /currentStep === 2[\s\S]*HSP, rendimento e meta de geração[\s\S]*currentStep === 3[\s\S]*Quantidade de módulos e área do telhado[\s\S]*currentStep === 4[\s\S]*Seleção do kit cadastrado/,
  );
  assert.match(calculator, /if \(currentStep === 3\) \{[\s\S]*const moduleFields = \[/);
  assert.match(calculator, /if \(currentStep === 4 && !selectedKit\)/);
});
'''
if 'ocupa a aba 4 separada' not in tests:
    tests += new_test
    TEST_PATH.write_text(tests, encoding='utf-8')
