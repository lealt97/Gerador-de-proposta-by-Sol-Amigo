import { PdfTheme } from '../../../types/pdfModels';

export type DynamicCoverValues = {
  clientName?: string;
  clientDocument?: string;
  cityState?: string;
  date?: string;
  validityText?: string;
  powerKwp?: string;
  proposalCode?: string;
  companyName?: string;
  sellerName?: string;
  systemType?: string;
  investment?: string;
};

type DynamicField = keyof DynamicCoverValues;

type FieldDefinition = {
  patterns: RegExp[];
  maxChars: number;
  bold?: boolean;
  uppercase?: boolean;
};

const SVG_NS = 'http://www.w3.org/2000/svg';

const FIELD_DEFINITIONS: Record<DynamicField, FieldDefinition> = {
  clientName: {
    patterns: [
      /nome sobrenome/,
      /nome do cliente/,
      /cliente nome/,
      /client name/,
      /nome cliente/,
    ],
    maxChars: 42,
    bold: true,
    uppercase: true,
  },
  clientDocument: {
    patterns: [
      /cpf cnpj valor/,
      /documento cliente/,
      /document value/,
      /cpf valor/,
      /cnpj valor/,
    ],
    maxChars: 24,
  },
  cityState: {
    patterns: [
      /cidade estado/,
      /cidade uf/,
      /cidade estado valor/,
      /localizacao valor/,
      /localizacao texto/,
      /city state/,
    ],
    maxChars: 36,
    uppercase: true,
  },
  date: {
    patterns: [
      /dd mm aaaa/,
      /dd mm aa/,
      /data valor/,
      /data texto/,
      /date value/,
    ],
    maxChars: 16,
  },
  validityText: {
    patterns: [
      /validade 7 dias/,
      /validade dias/,
      /validade valor/,
      /validade texto/,
      /validity/,
    ],
    maxChars: 28,
  },
  powerKwp: {
    patterns: [
      /0 00 kwp/,
      /00 00 kwp/,
      /4 95 kwp/,
      /potencia nominal valor/,
      /potencia valor/,
      /power value/,
      /valor kwp/,
    ],
    maxChars: 18,
    bold: true,
  },
  proposalCode: {
    patterns: [
      /codigo da proposta/,
      /codigo proposta/,
      /numero da proposta/,
      /numero proposta/,
      /proposal code/,
    ],
    maxChars: 24,
    bold: true,
  },
  companyName: {
    patterns: [
      /nome da empresa/,
      /nome empresa/,
      /empresa nome/,
      /company name/,
    ],
    maxChars: 42,
    bold: true,
  },
  sellerName: {
    patterns: [
      /nome do vendedor/,
      /nome vendedor/,
      /nome consultor/,
      /consultor valor/,
      /responsavel comercial valor/,
    ],
    maxChars: 36,
  },
  systemType: {
    patterns: [
      /tipo de sistema valor/,
      /tipo sistema valor/,
      /system type/,
      /on grid valor/,
    ],
    maxChars: 24,
    bold: true,
  },
  investment: {
    patterns: [
      /valor do investimento/,
      /investimento valor/,
      /investment value/,
      /r 0 00/,
    ],
    maxChars: 24,
    bold: true,
  },
};

const CORE_FIELDS: DynamicField[] = [
  'clientName',
  'cityState',
  'date',
  'validityText',
  'powerKwp',
];

function normalizeIdentifier(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&[#a-z0-9]+;/gi, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function truncate(value: string, maxChars: number) {
  const clean = value.trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(1, maxChars - 1)).trim()}…`;
}

function isInsideDefinitions(element: Element) {
  return Boolean(element.closest('defs, clipPath, mask, pattern, symbol'));
}

function candidateText(element: Element) {
  return normalizeIdentifier([
    element.id,
    element.getAttribute('data-name') || '',
    element.getAttribute('aria-label') || '',
    element.getAttribute('inkscape:label') || '',
    element.textContent || '',
  ].join(' '));
}

function candidateScore(element: Element, field: DynamicField) {
  if (!element.id || isInsideDefinitions(element)) return -1;

  const normalized = candidateText(element);
  const definition = FIELD_DEFINITIONS[field];
  let score = -1;

  definition.patterns.forEach((pattern, index) => {
    if (pattern.test(normalized)) {
      score = Math.max(score, 200 - index * 10);
    }
  });

  if (score < 0) return score;

  const tagName = element.tagName.toLowerCase();
  if (tagName === 'path' || tagName === 'text' || tagName === 'tspan') score += 30;
  if (tagName === 'g') score -= Math.min(60, element.querySelectorAll('*').length * 2);
  if (normalized.includes('icone') || normalized.includes('icon')) score -= 100;
  if (normalized.includes('titulo') || normalized.includes('label')) score -= 30;

  return score;
}

function findCandidate(root: SVGSVGElement, field: DynamicField) {
  const candidates = Array.from(root.querySelectorAll('[id]'))
    .map((element) => ({ element, score: candidateScore(element, field) }))
    .filter((item) => item.score >= 0)
    .sort((left, right) => right.score - left.score);

  return candidates[0]?.element as SVGGraphicsElement | undefined;
}

function getViewBox(root: SVGSVGElement) {
  const viewBox = root.viewBox?.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return {
      x: viewBox.x,
      y: viewBox.y,
      width: viewBox.width,
      height: viewBox.height,
    };
  }

  return {
    x: 0,
    y: 0,
    width: Number(root.getAttribute('width')) || 595,
    height: Number(root.getAttribute('height')) || 842,
  };
}

function getElementBounds(root: SVGSVGElement, element: SVGGraphicsElement) {
  const rootRect = root.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const viewBox = getViewBox(root);

  if (!rootRect.width || !rootRect.height || !elementRect.width || !elementRect.height) {
    return null;
  }

  return {
    x: viewBox.x + ((elementRect.left - rootRect.left) / rootRect.width) * viewBox.width,
    y: viewBox.y + ((elementRect.top - rootRect.top) / rootRect.height) * viewBox.height,
    width: (elementRect.width / rootRect.width) * viewBox.width,
    height: (elementRect.height / rootRect.height) * viewBox.height,
  };
}

function resolveFill(element: Element, theme: PdfTheme) {
  const graphic = element.matches('path, text, tspan')
    ? element
    : element.querySelector('path, text, tspan');

  const directFill = graphic?.getAttribute('fill');
  if (directFill && directFill !== 'none' && !directFill.startsWith('url(')) {
    return directFill;
  }

  if (graphic instanceof SVGElement) {
    const computedFill = window.getComputedStyle(graphic).fill;
    if (computedFill && computedFill !== 'none') return computedFill;
  }

  return theme.neutral || '#1E1E1E';
}

function createTextElement(
  root: SVGSVGElement,
  field: DynamicField,
  value: string,
  bounds: { x: number; y: number; width: number; height: number },
  fill: string,
  sourceIdentifier: string,
) {
  const definition = FIELD_DEFINITIONS[field];
  const shouldUppercase = definition.uppercase || (
    sourceIdentifier.length > 3 &&
    sourceIdentifier === sourceIdentifier.toUpperCase()
  );
  const output = truncate(shouldUppercase ? value.toUpperCase() : value, definition.maxChars);

  const minFontSize = field === 'validityText' ? 7 : 8;
  const maxFontSize = field === 'powerKwp' || field === 'investment' ? 28 : 20;
  let fontSize = Math.max(minFontSize, Math.min(maxFontSize, bounds.height * 0.88));
  const estimatedWidth = () => output.length * fontSize * 0.56;

  while (fontSize > minFontSize && estimatedWidth() > bounds.width * 1.08) {
    fontSize -= 0.5;
  }

  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('id', `dynamic-cover-${field}`);
  text.setAttribute('data-dynamic-cover-field', field);
  text.setAttribute('x', bounds.x.toFixed(2));
  text.setAttribute('y', (bounds.y + bounds.height * 0.84).toFixed(2));
  text.setAttribute('fill', fill);
  text.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
  text.setAttribute('font-size', fontSize.toFixed(2));
  text.setAttribute('font-weight', definition.bold ? '700' : '500');
  text.setAttribute('letter-spacing', field === 'proposalCode' ? '0.2' : '0');
  text.setAttribute('pointer-events', 'none');

  if (estimatedWidth() > bounds.width && bounds.width > 20) {
    text.setAttribute('textLength', bounds.width.toFixed(2));
    text.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }

  text.textContent = output;
  root.appendChild(text);
}

function valueAlreadyRendered(root: SVGSVGElement, value: string) {
  const expected = normalizeIdentifier(value);
  if (!expected) return false;

  return Array.from(root.querySelectorAll('text, tspan')).some((element) => {
    const actual = normalizeIdentifier(element.textContent || '');
    return actual === expected || (expected.length > 7 && actual.includes(expected));
  });
}

function addFallbackPanel(
  root: SVGSVGElement,
  values: DynamicCoverValues,
  missingFields: DynamicField[],
  theme: PdfTheme,
  presetId?: string,
) {
  const fields = CORE_FIELDS.filter((field) => missingFields.includes(field) && values[field]);
  if (!fields.length) return;

  const viewBox = getViewBox(root);
  const panelWidth = Math.min(547, viewBox.width - 36);
  const panelHeight = 94;
  const x = viewBox.x + (viewBox.width - panelWidth) / 2;
  const y = viewBox.y + viewBox.height - panelHeight - 16;
  const primary = theme.primary || '#0A2249';
  const secondary = theme.secondary || '#C49133';
  const neutral = theme.neutral || '#1E1E1E';

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('id', `dynamic-cover-fallback-${presetId || 'default'}`);
  group.setAttribute('data-dynamic-cover-fallback', 'true');
  group.setAttribute('pointer-events', 'none');

  const background = document.createElementNS(SVG_NS, 'rect');
  background.setAttribute('x', x.toFixed(2));
  background.setAttribute('y', y.toFixed(2));
  background.setAttribute('width', panelWidth.toFixed(2));
  background.setAttribute('height', panelHeight.toFixed(2));
  background.setAttribute('rx', '10');
  background.setAttribute('fill', '#FFFFFF');
  background.setAttribute('fill-opacity', '0.95');
  background.setAttribute('stroke', secondary);
  background.setAttribute('stroke-width', '1.2');
  group.appendChild(background);

  const accent = document.createElementNS(SVG_NS, 'rect');
  accent.setAttribute('x', x.toFixed(2));
  accent.setAttribute('y', y.toFixed(2));
  accent.setAttribute('width', '7');
  accent.setAttribute('height', panelHeight.toFixed(2));
  accent.setAttribute('rx', '3.5');
  accent.setAttribute('fill', primary);
  group.appendChild(accent);

  const addLine = (
    label: string,
    value: string,
    lineX: number,
    lineY: number,
    valueSize = 12,
    anchor: 'start' | 'end' = 'start',
  ) => {
    const labelText = document.createElementNS(SVG_NS, 'text');
    labelText.setAttribute('x', lineX.toFixed(2));
    labelText.setAttribute('y', lineY.toFixed(2));
    labelText.setAttribute('fill', secondary);
    labelText.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
    labelText.setAttribute('font-size', '8');
    labelText.setAttribute('font-weight', '700');
    labelText.setAttribute('text-anchor', anchor);
    labelText.textContent = label.toUpperCase();
    group.appendChild(labelText);

    const valueText = document.createElementNS(SVG_NS, 'text');
    valueText.setAttribute('x', lineX.toFixed(2));
    valueText.setAttribute('y', (lineY + 15).toFixed(2));
    valueText.setAttribute('fill', neutral);
    valueText.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
    valueText.setAttribute('font-size', String(valueSize));
    valueText.setAttribute('font-weight', valueSize >= 15 ? '700' : '600');
    valueText.setAttribute('text-anchor', anchor);
    valueText.textContent = truncate(value, anchor === 'end' ? 22 : 38);
    group.appendChild(valueText);
  };

  const leftX = x + 22;
  const rightX = x + panelWidth - 18;

  if (fields.includes('clientName') && values.clientName) {
    addLine('Cliente', values.clientName, leftX, y + 21, 12);
  }
  if (fields.includes('cityState') && values.cityState) {
    addLine('Localização', values.cityState, leftX, y + 58, 11);
  }
  if (fields.includes('powerKwp') && values.powerKwp) {
    addLine('Potência nominal', values.powerKwp, rightX, y + 21, 17, 'end');
  }

  const dateParts = [
    fields.includes('date') ? values.date : '',
    fields.includes('validityText') ? values.validityText : '',
  ].filter(Boolean).join(' • ');

  if (dateParts) {
    addLine('Emissão', dateParts, rightX, y + 58, 10, 'end');
  }

  root.appendChild(group);
}

export function applyDynamicCoverData(
  svgSource: string,
  values: DynamicCoverValues,
  theme: PdfTheme,
  presetId?: string,
) {
  if (typeof document === 'undefined' || typeof DOMParser === 'undefined') {
    return svgSource;
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(svgSource, 'image/svg+xml');
  const sourceRoot = parsed.documentElement;
  if (sourceRoot.tagName.toLowerCase() !== 'svg') return svgSource;

  const root = document.importNode(sourceRoot, true) as SVGSVGElement;
  const viewBox = getViewBox(root);
  root.setAttribute('width', String(viewBox.width));
  root.setAttribute('height', String(viewBox.height));

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.position = 'fixed';
  host.style.left = '-20000px';
  host.style.top = '0';
  host.style.width = `${viewBox.width}px`;
  host.style.height = `${viewBox.height}px`;
  host.style.opacity = '0';
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-1';
  host.appendChild(root);
  document.body.appendChild(host);

  const missingFields: DynamicField[] = [];

  try {
    (Object.keys(FIELD_DEFINITIONS) as DynamicField[]).forEach((field) => {
      const rawValue = values[field];
      if (!rawValue?.trim()) return;
      if (valueAlreadyRendered(root, rawValue)) return;

      const candidate = findCandidate(root, field);
      if (!candidate) {
        missingFields.push(field);
        return;
      }

      const bounds = getElementBounds(root, candidate);
      if (!bounds || bounds.width < 4 || bounds.height < 3) {
        missingFields.push(field);
        return;
      }

      const fill = resolveFill(candidate, theme);
      const sourceIdentifier = candidate.id || candidateText(candidate);
      candidate.setAttribute('opacity', '0');
      candidate.setAttribute('aria-hidden', 'true');
      createTextElement(root, field, rawValue, bounds, fill, sourceIdentifier);
    });

    addFallbackPanel(root, values, missingFields, theme, presetId);
    return new XMLSerializer().serializeToString(root);
  } catch (error) {
    console.warn('Não foi possível aplicar todos os dados dinâmicos na capa.', error);
    return svgSource;
  } finally {
    host.remove();
  }
}
