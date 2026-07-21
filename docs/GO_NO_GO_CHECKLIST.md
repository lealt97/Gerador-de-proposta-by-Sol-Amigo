# Checklist formal GO / NO-GO

## Identificação

- versão avaliada:
- commit/tag:
- ambiente:
- data da reunião:
- responsável pelo produto:
- responsável técnico:
- responsável por segurança:
- responsável jurídico/comercial:

A ausência de um responsável obrigatório resulta em **NO-GO**.

## 1. Produto e experiência

- [ ] Cadastro e confirmação de conta funcionam sem suporte.
- [ ] Onboarding conduz empresa, logo, kit, cliente e primeira proposta.
- [ ] Dimensionamento, preço, margem, economia e payback foram revisados por especialista FV.
- [ ] O produto identifica claramente o payback como simples.
- [ ] PDFs foram aprovados em desktop, celular e navegadores suportados.
- [ ] Link público registra visualização, aprovação e recusa corretamente.
- [ ] Estados vazios, erros e bloqueios orientam a próxima ação.
- [ ] Todos os problemas P0 e P1 do beta estão encerrados.

## 2. Segurança e dados

- [ ] RLS e testes de isolamento passaram no commit candidato.
- [ ] Arquivos privados não possuem URL pública persistente.
- [ ] MFA, recuperação e operações críticas foram homologados.
- [ ] Nenhum segredo está em bundle, log, exportação ou repositório.
- [ ] Exportação contém somente dados da conta autenticada.
- [ ] Exclusão remove banco, Auth e arquivos gerenciados.
- [ ] Painel administrativo exige papel server-side.
- [ ] Bloqueios e reativações exigem justificativa e auditoria.
- [ ] Processo de resposta a incidentes possui responsáveis e contatos.

Qualquer falha de isolamento, segredo exposto ou acesso administrativo indevido resulta em **NO-GO**.

## 3. Cobrança

- [ ] Checkout mensal e anual passaram em sandbox e produção controlada.
- [ ] Preço e produto são resolvidos no servidor.
- [ ] Webhooks inválidos são rejeitados.
- [ ] Eventos repetidos são idempotentes.
- [ ] Aprovação, recusa, inadimplência, tolerância, cancelamento e reativação foram testados.
- [ ] Cotas gratuitas, mensais e anuais refletem a assinatura efetiva.
- [ ] Reembolso e chargeback possuem procedimento operacional.
- [ ] Nenhuma conta pode ser cobrada simultaneamente por Cakto e Stripe.

Cobrança incorreta ou ativação sem evento autenticado resulta em **NO-GO**.

## 4. Jurídico e LGPD

- [ ] Termos de Uso aprovados e publicados em versão não draft.
- [ ] Política de Privacidade aprovada e publicada em versão não draft.
- [ ] Política de Cancelamento e Reembolso aprovada e publicada em versão não draft.
- [ ] Razão social, CNPJ, contatos e jurisdição foram preenchidos.
- [ ] Controlador, operadores, encarregado e canal do titular foram definidos.
- [ ] Bases legais, finalidades, fornecedores e transferências foram revisados.
- [ ] Períodos de retenção foram aprovados.
- [ ] Fluxo de novo aceite para mudança material foi validado.
- [ ] Cookies e ferramentas de rastreamento foram inventariados.

Documento legal ainda marcado como `draft` resulta em **NO-GO para lançamento aberto**.

## 5. Infraestrutura e operação

- [ ] Desenvolvimento, homologação e produção estão separados.
- [ ] Migrations aplicam do zero e sobre backup restaurado.
- [ ] Backups automáticos estão ativos e a restauração foi testada.
- [ ] Healthcheck e disponibilidade são monitorados.
- [ ] Falhas de PDF, checkout e Edge Functions geram alerta tratável.
- [ ] Limites e custos de Supabase, Storage e Railway foram revisados.
- [ ] Domínio, HTTPS, SPF, DKIM e DMARC foram validados.
- [ ] Existe escala de suporte durante o lançamento.
- [ ] Existe procedimento de rollback testado.

## 6. Beta

- [ ] Participaram entre 5 e 10 integradores solares reais.
- [ ] Cada participante percorreu o roteiro mínimo.
- [ ] Métricas de ativação e conclusão foram consolidadas.
- [ ] Erros e feedbacks foram classificados por prioridade.
- [ ] Zero P0 permanece aberto.
- [ ] P1 foram corrigidos ou impedem formalmente o lançamento.
- [ ] Exportação e exclusão foram testadas com conta descartável.
- [ ] Custo de suporte e objeções comerciais foram avaliados.
- [ ] Responsáveis revisaram evidências, e não apenas relatos verbais.

## Matriz de decisão

### GO

Marcar somente quando:

- todos os bloqueadores acima estão concluídos;
- não existe P0 ou P1 aberto;
- documentos legais estão aprovados;
- cobrança e exclusão foram homologadas;
- responsáveis técnico, produto, segurança e jurídico/comercial assinaram a decisão.

### GO condicionado

Permitido apenas para beta fechado, com:

- participantes identificados e limite de acesso;
- dados fictícios ou autorizados;
- cobrança desativada ou restrita a sandbox;
- riscos documentados;
- prazo e responsável por cada condição;
- possibilidade de interrupção imediata.

GO condicionado **não autoriza lançamento comercial aberto**.

### NO-GO

Obrigatório quando existir:

- exposição ou mistura de dados;
- perda de dados ou exclusão incompleta;
- cobrança incorreta;
- vulnerabilidade crítica/alta sem mitigação aceita;
- documento legal draft no lançamento aberto;
- P0 ou P1 aberto;
- ausência de monitoramento, backup restaurável ou responsável de incidente.

## Registro da decisão

Decisão: `GO` / `GO CONDICIONADO` / `NO-GO`

Justificativa:

Riscos aceitos:

Condições e prazos:

Assinaturas:

- Produto:
- Tecnologia:
- Segurança:
- Jurídico/comercial:
- Operação/suporte:
