import { PdfTheme } from '../../../types/pdfModels';

export type CoverOverlayValues = {
  clientName?: string;
  powerKwp?: string;
  cityState?: string;
  date?: string;
  validityText?: string;
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const truncate = (value: string, max: number) => {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
};

const safeText = (value: string | undefined, fallback: string, max = 34) =>
  escapeXml(truncate((value || fallback).trim() || fallback, max));

function injectBeforeSvgEnd(svg: string, content: string) {
  const index = svg.lastIndexOf('</svg>');
  if (index === -1) return `${svg}${content}`;
  return `${svg.slice(0, index)}${content}${svg.slice(index)}`;
}

function buildPreset2Overlay(values: CoverOverlayValues, theme: PdfTheme) {
  const labelColor = theme.secondary || '#AFB77D';
  const valueColor = theme.neutral || '#1E1E1E';
  const bgColor = '#F9F9F9';

  const clientName = safeText(values.clientName, 'Cliente', 30).toUpperCase();
  const cityState = safeText(values.cityState, 'Localização a confirmar', 28).toUpperCase();
  const date = safeText(values.date, new Date().toLocaleDateString('pt-BR'), 14).toUpperCase();
  const validityText = safeText(values.validityText, 'validade: 7 dias', 22);
  const powerKwp = safeText(values.powerKwp, '0,00 kWp', 16);

  return `
  <g id="dynamic-cover-data-overlay" pointer-events="none">
    <rect x="98" y="535" width="205" height="55" fill="${bgColor}" />
    <rect x="98" y="617" width="215" height="55" fill="${bgColor}" />
    <rect x="98" y="697" width="190" height="78" fill="${bgColor}" />
    <rect x="438" y="594" width="145" height="72" fill="${bgColor}" />

    <text x="106" y="549" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="${labelColor}">CLIENTE</text>
    <text x="106" y="572" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="${valueColor}">${clientName}</text>

    <text x="106" y="631" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="${labelColor}">LOCALIZAÇÃO</text>
    <text x="106" y="654" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="${valueColor}">${cityState}</text>

    <text x="106" y="711" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="${labelColor}">DATA</text>
    <text x="106" y="734" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="${valueColor}">${date}</text>
    <text x="106" y="755" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="500" fill="${valueColor}">${validityText}</text>

    <text x="438" y="612" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="${labelColor}">POTÊNCIA NOMINAL</text>
    <text x="438" y="645" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="800" fill="${valueColor}">${powerKwp}</text>
  </g>`;
}

export function applyCoverDataOverlay(
  svg: string,
  presetId: string | undefined,
  values: CoverOverlayValues,
  theme: PdfTheme,
) {
  if (presetId === 'preset-2') {
    return injectBeforeSvgEnd(svg, buildPreset2Overlay(values, theme));
  }

  return svg;
}
