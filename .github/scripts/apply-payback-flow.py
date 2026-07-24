from pathlib import Path


VIEW_PATH = Path('src/pages/propostas/ProfessionalSizingCalculatorView.tsx')


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise SystemExit(f'Marcador não encontrado: {label}')
    return source.replace(old, new, 1)


source = VIEW_PATH.read_text(encoding='utf-8')

source = replace_once(
    source,
    """} from '../../lib/calculations/moduleSizing';
import { clientService } from '../../services/clientService';
""",
    """} from '../../lib/calculations/moduleSizing';
import type { PaybackResult } from '../../lib/calculations/payback';
import { clientService } from '../../services/clientService';
""",
    'import do resultado de payback',
)

source = replace_once(
    source,
    """import type { SolarKit } from '../../types/solarKit';
import { RoofPhotoUpload } from './RoofPhotoUpload';
""",
    """import type { SolarKit } from '../../types/solarKit';
import { PaybackStep } from './PaybackStep';
import { RoofPhotoUpload } from './RoofPhotoUpload';
""",
    'import da etapa de payback',
)

source = replace_once(
    source,
    """const STEPS = [
  { id: 'client', title: 'Cliente' },
  { id: 'consumption', title: 'Consumo' },
  { id: 'irradiation', title: 'HSP e meta de geração' },
  { id: 'modules', title: 'Quantidade de módulos e área do telhado' },
  { id: 'kit', title: 'Kit e resultado' },
] as const;
""",
    """const STEPS = [
  { id: 'client', title: 'Cliente' },
  { id: 'consumption', title: 'Consumo' },
  { id: 'irradiation', title: 'HSP e meta de geração' },
  { id: 'modules', title: 'Quantidade de módulos e área do telhado' },
  { id: 'kit', title: 'Kit solar' },
  { id: 'payback', title: 'Payback' },
  { id: 'result', title: 'Resultado' },
] as const;
""",
    'ordem das etapas',
)

source = replace_once(
    source,
    """  const [selectedKitId, setSelectedKitId] = useState('');
  const [isLoadingKits, setIsLoadingKits] = useState(true);
  const [kitsError, setKitsError] = useState<string | null>(null);
""",
    """  const [selectedKitId, setSelectedKitId] = useState('');
  const [isLoadingKits, setIsLoadingKits] = useState(true);
  const [kitsError, setKitsError] = useState<string | null>(null);
  const [paybackResult, setPaybackResult] = useState<PaybackResult | null>(null);
""",
    'estado do payback',
)

source = replace_once(
    source,
    """    if (currentStep === 4 && !selectedKit) {
      toast.error('Selecione um kit on-grid cadastrado.');
      return false;
    }

    return true;
""",
    """    if (currentStep === 4 && !selectedKit) {
      toast.error('Selecione um kit on-grid cadastrado.');
      return false;
    }

    if (currentStep === 5 && !paybackResult) {
      toast.error('Revise os dados financeiros para calcular o payback.');
      return false;
    }

    return true;
""",
    'validação do payback',
)

source = replace_once(
    source,
    """                    <Select value={selectedKitId} onChange={(event) => setSelectedKitId(event.target.value)}>
""",
    """                    <Select
                      value={selectedKitId}
                      onChange={(event) => {
                        setSelectedKitId(event.target.value);
                        setPaybackResult(null);
                      }}
                    >
""",
    'reset do payback ao trocar kit',
)

navigation_marker = """            <div className="mt-8 flex justify-between border-t border-brand-border pt-6">
"""
insert = """            {currentStep === 5 && (
              selectedKit && result ? (
                <PaybackStep
                  selectedKit={selectedKit}
                  connectionType={connectionType}
                  monthlyCompensableConsumptionKwh={result.compensableMonthlyConsumptionKwh}
                  monthlyGenerationKwh={result.selectedKitEstimatedMonthlyGenerationKwh ?? result.targetMonthlyGenerationKwh}
                  onResultChange={setPaybackResult}
                />
              ) : (
                <ErrorState message="Selecione um kit e conclua o dimensionamento antes de calcular o payback." />
              )
            )}

            {currentStep === 6 && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-brand-dark">Resultado do dimensionamento</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Revise os principais dados técnicos e financeiros antes de concluir.
                  </p>
                </div>

                {selectedKit && result && paybackResult ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Summary label="Kit selecionado" value={selectedKit.name} />
                      <Summary label="Potência do kit" value={`${number.format(selectedKit.kit_power_kwp)} kWp`} />
                      <Summary label="Investimento final" value={`R$ ${number.format(paybackResult.totalInvestment)}`} />
                      <Summary label="Payback" value={`${number.format(paybackResult.paybackYears)} anos`} highlight />
                    </div>

                    <div className={`flex items-start gap-3 rounded-xl border p-5 ${
                      paybackResult.status === 'unfeasible'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}>
                      {paybackResult.status === 'unfeasible' ? (
                        <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider opacity-75">Status financeiro</p>
                        <h3 className="mt-1 text-lg font-bold">Payback {paybackResult.statusLabel}</h3>
                        <p className="mt-1 text-sm leading-6">
                          Economia mensal estimada de <strong>R$ {number.format(paybackResult.monthlySavings)}</strong> e anual de <strong>R$ {number.format(paybackResult.annualSavings)}</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="shadow-none">
                        <CardContent className="p-5">
                          <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Resultado técnico</p>
                          <dl className="mt-4 space-y-3 text-sm">
                            <PreviewRow label="Potência necessária" value={`${number.format(result.requiredPowerKwp)} kWp`} />
                            <PreviewRow label="Geração estimada" value={`${number.format(result.selectedKitEstimatedMonthlyGenerationKwh ?? 0)} kWh/mês`} />
                            <PreviewRow label="Cobertura da meta" value={`${number.format(result.selectedKitCoveragePercent ?? 0)}%`} />
                          </dl>
                        </CardContent>
                      </Card>

                      <Card className="shadow-none">
                        <CardContent className="p-5">
                          <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Resultado financeiro</p>
                          <dl className="mt-4 space-y-3 text-sm">
                            <PreviewRow label="Custo direto" value={`R$ ${number.format(paybackResult.directCost)}`} />
                            <PreviewRow label="Lucro estimado" value={`R$ ${number.format(paybackResult.profitAmount)}`} />
                            <PreviewRow label="Margem aplicada" value={`${number.format(paybackResult.marginPercentage)}%`} />
                          </dl>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                ) : (
                  <ErrorState message="Preencha as etapas anteriores para gerar o resultado final." />
                )}
              </section>
            )}

"""

if insert.strip() not in source:
    if navigation_marker not in source:
        raise SystemExit('Marcador da navegação não encontrado.')
    source = source.replace(navigation_marker, insert + navigation_marker, 1)

VIEW_PATH.write_text(source, encoding='utf-8')
