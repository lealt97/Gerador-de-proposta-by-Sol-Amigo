import './ProfessionalSizingCalculatorInputOnly.css';
import { ProfessionalSizingCalculator as BaseProfessionalSizingCalculator } from './ProfessionalSizingCalculatorView';

export function ProfessionalSizingCalculator() {
  return (
    <div className="generation-input-only">
      <BaseProfessionalSizingCalculator />
    </div>
  );
}
