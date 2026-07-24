from pathlib import Path
import runpy

calculator = Path('src/pages/propostas/ProfessionalSizingCalculatorView.tsx')
diagnostic = Path('.github/patch-finalized-proposal-actions.txt')
original = calculator.read_text(encoding='utf-8')
old_marker = "</div>\n\n                {isLoadingClients ? ("
normalized_marker = "</div>\n\n                 {isLoadingClients ? ("

try:
    if old_marker not in original:
        raise RuntimeError('Marcador de clientes não encontrado para normalização.')

    calculator.write_text(original.replace(old_marker, normalized_marker, 1), encoding='utf-8')
    runpy.run_path('.github/scripts/apply-finalized-proposal-actions-v2.py', run_name='__main__')
    diagnostic.unlink(missing_ok=True)
except BaseException as error:
    calculator.write_text(original, encoding='utf-8')
    diagnostic.write_text(f'{type(error).__name__}: {error}\n', encoding='utf-8')
