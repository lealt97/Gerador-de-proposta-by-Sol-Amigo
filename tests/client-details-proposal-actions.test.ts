import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const CLIENT_DETAILS = 'src/pages/clientes/ClientDetails.tsx';

test('visão geral lista todas as propostas vinculadas ao cliente com dados do fluxo', async () => {
  const source = await readFile(CLIENT_DETAILS, 'utf8');

  assert.match(source, /\.from\('proposals'\)/);
  assert.match(source, /\.eq\('client_id', clientId\)/);
  assert.match(source, /flow_state, flow_completed/);
  assert.match(source, /Propostas do cliente/);
  assert.match(source, /Visualize e gerencie todas as propostas vinculadas a este cliente/);
  assert.match(source, /draft: 'Rascunho'/);
});

test('rascunhos oferecem continuar e excluir, enquanto finalizadas oferecem todas as ações', async () => {
  const source = await readFile(CLIENT_DETAILS, 'utf8');

  assert.match(source, /const isFlowDraft = isActiveProposalFlowDraft\(proposal\)/);
  assert.match(source, /isFlowDraft \? \([\s\S]*Continuar[\s\S]*\) : \([\s\S]*title="Visualizar"[\s\S]*title="Editar"[\s\S]*title="Duplicar"[\s\S]*title="Renomear"/);
  assert.match(source, /title="Excluir"/);
  assert.match(source, /getProposalContinuePath\(proposal\.id\)/);
  assert.match(source, /getProposalEditPath\(proposal\.id\)/);
  assert.match(source, /proposalService\.duplicateProposal\(proposal\.id\)/);
  assert.match(source, /proposalService\.renameProposal\(proposalToRename\.id, title\)/);
  assert.match(source, /<RenameProposalModal/);
  assert.match(source, /<DeleteConfirmModal/);
});
