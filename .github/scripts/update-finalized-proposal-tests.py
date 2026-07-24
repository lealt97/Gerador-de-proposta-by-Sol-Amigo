from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise SystemExit(f'Marcador não encontrado: {label}')
    return source.replace(old, new, 1)


readiness_path = Path('tests/p2-launch-readiness.test.ts')
readiness = readiness_path.read_text(encoding='utf-8')
readiness = replace_once(
    readiness,
    "test('dimensionamento começa pelo cliente e oferece três modos de consumo sem reativar mutações antigas', async () => {",
    "test('dimensionamento começa pelo cliente, oferece três modos de consumo e persiste propostas com segurança', async () => {",
    'nome do teste de prontidão',
)
readiness = replace_once(
    readiness,
    "  assert.doesNotMatch(service, /createProposal/);\n  assert.doesNotMatch(service, /updateProposal/);\n  assert.doesNotMatch(service, /duplicateProposal/);",
    "  assert.match(service, /createOrResumeFlowDraft/);\n  assert.match(service, /saveCompletedProposal/);\n  assert.match(service, /duplicateProposal/);",
    'asserções de persistência',
)
readiness_path.write_text(readiness, encoding='utf-8')

flow_path = Path('tests/proposal-draft-flow.test.ts')
flow = flow_path.read_text(encoding='utf-8')
flow = replace_once(
    flow,
    "  assert.match(calculator, /hydrateProposalDraft\\(proposal\\.flow_state\\)/);",
    "  assert.match(calculator, /hydrateProposalDraft\\(proposal\\.flow_state, proposal\\.title \\|\\| '', isEditMode\\)/);",
    'hidratação atualizada',
)
flow = replace_once(
    flow,
    "  assert.match(list, /isFlowDraft \\? \\([\\s\\S]*Continuar[\\s\\S]*\\) : \\([\\s\\S]*title=\"Visualizar\"/);\n  assert.match(list, /title=\"Excluir\"/);\n  assert.doesNotMatch(list, /Duplicar/);\n  assert.doesNotMatch(list, /Editar/);",
    "  assert.match(list, /isFlowDraft \\? \\([\\s\\S]*Continuar[\\s\\S]*\\) : \\([\\s\\S]*title=\"Visualizar\"[\\s\\S]*title=\"Editar\"[\\s\\S]*title=\"Duplicar\"[\\s\\S]*title=\"Renomear\"/);\n  assert.match(list, /title=\"Excluir\"/);",
    'ações condicionais da listagem',
)
flow_path.write_text(flow, encoding='utf-8')
