from pathlib import Path
import runpy

calculator = Path('src/pages/propostas/ProfessionalSizingCalculatorView.tsx')
original = calculator.read_text(encoding='utf-8')
old_marker = "</div>\n\n                {isLoadingClients ? ("
normalized_marker = "</div>\n\n                 {isLoadingClients ? ("

if old_marker not in original:
    raise SystemExit('Marcador de clientes não encontrado para normalização.')

calculator.write_text(original.replace(old_marker, normalized_marker, 1), encoding='utf-8')

try:
    runpy.run_path('.github/scripts/apply-finalized-proposal-actions-v2.py', run_name='__main__')
except Exception:
    calculator.write_text(original, encoding='utf-8')
    raise
