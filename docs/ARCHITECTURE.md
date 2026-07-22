# Arquitetura do Sol Amigo Pro

Este documento define as regras para evoluir o projeto sem alterar comportamentos ou layouts existentes de forma acidental.

## Princípios

1. **Feature-first para novos módulos**: novas áreas de negócio devem nascer em `src/features/<modulo>`.
2. **Componentes globais somente quando realmente reutilizáveis**: elementos visuais genéricos permanecem em `src/components/ui`.
3. **Páginas compõem; services persistem**: páginas não devem concentrar regras de acesso ao Supabase, transformação de payloads e renderização ao mesmo tempo.
4. **Tipos de domínio explícitos**: contratos compartilhados ficam em `src/types` ou dentro da feature quando forem locais.
5. **Sem implementações paralelas visíveis**: uma funcionalidade deve ter uma rota oficial e uma única implementação ativa.
6. **Mudanças de banco somente por migration**: alterações em produção devem ser reproduzíveis a partir de `supabase/migrations`.
7. **Layout protegido**: refatorações internas devem preservar classes, hierarquia visual, textos e comportamento dos componentes, salvo mudança de produto aprovada.

## Estrutura recomendada

```text
src/
  components/
    auth/
    brand/
    icons/
    layout/
    ui/
  contexts/
  features/
    admin/
    billing/
    clients/
    dashboard/
    design-pdf/
    proposals/
    settings/
    solar-kits/
  lib/
    auth/
    billing/
    pdf/
    supabase/
    theme/
    validations/
  pages/
  services/
  types/
```

A migração para essa estrutura deve ser gradual. Arquivos existentes não precisam ser movidos apenas para obedecer ao desenho; cada mudança deve reduzir acoplamento ou duplicação de forma mensurável.

## Limites de responsabilidade

### `pages`

- define a composição de uma rota;
- conecta estados de carregamento, erro e navegação;
- não deve conter consultas extensas nem regras de persistência complexas.

### `features`

- concentra componentes, hooks, tipos e serviços específicos de um módulo;
- pode expor uma página pública para `src/pages` reexportar;
- não deve importar diretamente outra feature, exceto por contratos públicos bem definidos.

### `services`

- encapsula chamadas ao Supabase e Edge Functions;
- traduz erros de infraestrutura para erros de domínio;
- não contém componentes React.

### `components/ui`

- contém componentes visuais genéricos;
- não conhece tabelas, entidades ou regras comerciais do Sol Amigo Pro.

### `lib`

- contém funções puras, infraestrutura compartilhada e motores reutilizáveis;
- não deve depender de páginas.

## Fluxo seguro para futuras implementações

1. Definir o contrato de dados e os estados da interface.
2. Criar ou atualizar tipos de domínio.
3. Implementar a persistência em service ou Edge Function.
4. Adicionar testes unitários e, quando aplicável, testes SQL/RLS.
5. Integrar a interface sem duplicar rotas ou componentes existentes.
6. Executar `npm run build` e os testes E2E.
7. Confirmar que não houve alteração visual involuntária.

## Higiene do repositório

Scripts temporários de correção e diagnóstico não devem permanecer na raiz. Ferramentas reutilizáveis devem ficar em `scripts/`, possuir nome descritivo, documentação e proteção contra execução acidental em produção.

O comando abaixo valida essa regra:

```bash
npm run check:repo
```

A verificação também é executada no build protegido e no workflow de qualidade.

## Regras para Supabase

- migrations são imutáveis depois de aplicadas em ambientes compartilhados;
- operações administrativas usam Edge Functions ou `service_role` somente no servidor;
- o frontend nunca recebe `SUPABASE_SERVICE_ROLE_KEY`;
- toda nova tabela pertencente a uma conta deve ter RLS e teste de isolamento;
- mudanças críticas devem atualizar os testes de homologação local.

## Critério de conclusão

Uma implementação está pronta quando:

- TypeScript passa;
- testes automatizados passam;
- build de produção passa;
- migrations e RLS passam na homologação local quando houver mudança de banco;
- o fluxo existente continua funcional;
- o layout permanece intacto quando a alteração é apenas estrutural;
- não existem scripts temporários ou arquivos de diagnóstico soltos.
