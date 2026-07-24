from pathlib import Path


VIEW_PATH = Path('src/pages/propostas/ProfessionalSizingCalculatorView.tsx')


source = VIEW_PATH.read_text(encoding='utf-8')

import_line = "import type { SolarKit } from '../../types/solarKit';\n"
roof_import = "import { RoofPhotoUpload } from './RoofPhotoUpload';\n"
if roof_import not in source:
    if import_line not in source:
        raise SystemExit('Import de SolarKit não encontrado.')
    source = source.replace(import_line, import_line + roof_import, 1)

boundary = """                </div>
              </section>
            )}

            {currentStep === 4 && (
"""
replacement = """                </div>

                <RoofPhotoUpload clientId={selectedClient?.id ?? null} />
              </section>
            )}

            {currentStep === 4 && (
"""
if '<RoofPhotoUpload clientId={selectedClient?.id ?? null} />' not in source:
    if boundary not in source:
        raise SystemExit('Limite entre as abas 4 e 5 não encontrado.')
    source = source.replace(boundary, replacement, 1)

VIEW_PATH.write_text(source, encoding='utf-8')
