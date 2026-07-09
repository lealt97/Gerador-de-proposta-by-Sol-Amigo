# Status da refatoração

## Concluído

- Rota oficial `/design-pdf` integrada ao novo módulo em `src/features/design-pdf`.
- Front-end separado em componentes menores.
- Engine SVG separado por responsabilidade.
- Preview e geração final apontando para o mesmo motor.
- Arquivos legados do módulo removidos de `src/pages/design-pdf`.
- Documentação técnica adicionada.

## Mantido

- Mesmo backend Supabase.
- Mesma tabela `pdf_user_models`.
- Mesmos buckets `pdf-assets` e `logos`.
- Mesmos presets SVG.
- Mesma rota visível para o usuário.

## Próximos cuidados

- Executar `npm install`, se necessário.
- Executar `npm run lint`.
- Testar manualmente a rota `/design-pdf` usando `QA_CHECKLIST.md`.
