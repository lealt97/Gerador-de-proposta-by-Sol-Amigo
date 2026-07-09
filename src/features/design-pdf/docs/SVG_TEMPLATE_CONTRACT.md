# Contrato SVG — Design PDF

O engine do Design PDF manipula SVGs procurando IDs e textos previsíveis. Quanto mais padronizado o SVG, mais estável será o preview e a geração final.

## Foto da capa

Padrão recomendado:

```svg
<g id="cover-photo" data-photo-bounds="0 0 595 842">
  <clipPath id="clip-foto-aqui">...</clipPath>
  <g id="cover-photo-layer" clip-path="url(#clip-foto-aqui)"></g>
  <g id="foto_aqui_placeholder">...</g>
</g>
```

O `cover-photo-layer` recebe a imagem enviada pelo usuário. O `foto_aqui_placeholder` é ocultado quando a imagem real é aplicada.

## Logo

Use qualquer elemento ou grupo com `id` contendo `logo`, por exemplo:

```svg
<g id="logo_cliente">...</g>
```

O engine oculta esse placeholder e injeta a imagem do logo com `id="company-logo-image"`.

## Textos dinâmicos

Textos reconhecidos:

- `Nome do Cliente`
- `Nome Sobrenome`
- `0,00 kWp`
- `4.95 kWp`
- `Cidade - Estado`
- `Cidade-Estado`
- `DD/MM/AA`

## Cores

O engine substitui cores por comparação com a paleta original do preset e por aliases conhecidos. Para controle explícito, use IDs contendo:

- `cor_primaria`
- `Cor_primaria`
- `primary`
- `cor_secund`
- `Cor_secund`
- `secondary`

## IDs únicos

No final do build, todos os IDs recebem um sufixo por modelo. Isso evita conflito quando vários previews aparecem na mesma página.
