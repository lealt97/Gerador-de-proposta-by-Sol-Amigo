# Capas padrão do Design PDF

Esta pasta contém os 10 SVGs de capa usados como modelos padrão da aba **Design PDF**.

Os arquivos ativos são exatamente estes:

```txt
A4 - 1.svg
A4 - 2.svg
A4 - 3.svg
A4 - 4.svg
A4 - 5.svg
A4 - 6.svg
A4 - 7.svg
A4 - 8.svg
A4 - 9.svg
A4 -10.svg
```

Os três modelos antigos foram removidos desta pasta:

```txt
cover-model-1.svg
cover-model-2.svg
cover-model-3.svg
```

Depois de atualizar os arquivos desta pasta, rode o SQL:

```txt
supabase/sql/2026-07-06_design_pdf_flow.sql
```

O preview possui compatibilidade com as capas A4 exportadas do Figma, inclusive a imagem da capa aplicada no `<image>` dentro de `<pattern>`.

Para o motor de cores ficar 100% editável, a próxima etapa é normalizar os SVGs com os tokens:

```txt
var(--pdf-primary)
var(--pdf-secondary)
var(--pdf-accent)
var(--pdf-neutral)
#FFFFFF fixo
```
