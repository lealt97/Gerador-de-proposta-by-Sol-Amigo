# Design PDF

Módulo refatorado do Design PDF integrado à rota oficial `/design-pdf`.

## Objetivo

Manter o mesmo comportamento visual e funcional do módulo original, mas separar responsabilidades para facilitar manutenção e reutilização em outros projetos.

## Camadas

- `pages`: tela integrada à rota oficial.
- `components`: carrosséis, editor, preview, abas e controles.
- `engines`: manipulação isolada do SVG.
- `services`: fachada do serviço de persistência e storage.
- `config`: presets de capa.
- `types`: tipos públicos do módulo.

## Backend preservado

O módulo continua usando a tabela `pdf_user_models` e os buckets `pdf-assets` e `logos` existentes.
