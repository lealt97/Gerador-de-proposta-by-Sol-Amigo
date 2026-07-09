# Changelog — Design PDF

## Refatoração principal

- Criação do módulo `src/features/design-pdf`.
- Separação de página, componentes, engines, serviço, tipos e documentação.
- Integração preservando a rota `/design-pdf`.

## Polimento pós-merge

- `coverSvgEngine.ts` virou adaptador para o novo `svgTemplateEngine`.
- Preview e geração final usam o mesmo fluxo de SVG.
- Arquivos legados de `src/pages/design-pdf` foram removidos.
- Toggle de páginas padrão corrigido.
- Carrossel de presets ganhou estado vazio.
- Normalização de cores preserva `BLACK` e `WHITE`.
- Atualização de referências de IDs SVG ficou mais segura.
