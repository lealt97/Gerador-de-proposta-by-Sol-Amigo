import { PdfTheme, TransformConfig } from '../../../types/pdfModels';

type CoverValues = {
  clientName?: string;
  powerKwp?: string;
  cityState?: string;
  date?: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  coverImageTransform?: TransformConfig;
  logoTransform?: TransformConfig;
};

type CoverTheme = {
  current: PdfTheme;
  original?: PdfTheme;
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

const COLOR_ALIASES: Record<string, keyof PdfTheme> = {
  '#0A2249': 'primary',
  '#051225': 'primary',
  '#0051F0': 'primary',
  '#0051EF': 'primary',
  '#0151EF': 'primary',
  '#39B66A': 'primary',
  '#15AE51': 'primary',
  '#16AF52': 'primary',
  '#C49133': 'secondary',
  '#AFB77D': 'secondary',
  '#FFCC00': 'secondary',
  '#DEC488': 'secondary',
  '#FACB5C': 'accent',
  '#FFD600': 'accent',
  '#64B0F3': 'accent',
  '#1F2A2A': 'neutral',
  '#1E1E1E': 'neutral',
  '#3A3A3C': 'neutral',
  '#183956': 'neutral',
  '#D9D9D9': 'neutral',
};

function normalizeHex(value: string | null) {
  if (!value) return '';
  const color = value.trim();
  if (!color.startsWith('#')) return color;

  if (color.length === 4) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toUpperCase();
  }

  return color.toUpperCase();
}

function shouldSkipPaint(value: string | null) {
  if (!value) return true;
  const paint = value.trim();
  return paint === 'none' || paint === 'transparent' || paint.startsWith('url(') || normalizeHex(paint) === '#FFFFFF';
}

function mapPaint(value: string | null, theme: CoverTheme) {
  if (shouldSkipPaint(value)) return null;

  const normalized = normalizeHex(value);
  if (theme.original) {
    for (const key of Object.keys(theme.original) as Array<keyof PdfTheme>) {
      if (normalizeHex(theme.original[key]) === normalized) return theme.current[key];
    }
  }

  const alias = COLOR_ALIASES[normalized];
  return alias ? theme.current[alias] : null;
}

function applyPaintToElement(element: Element, theme: CoverTheme) {
  const fill = mapPaint(element.getAttribute('fill'), theme);
  if (fill) element.setAttribute('fill', fill);

  const stroke = mapPaint(element.getAttribute('stroke'), theme);
  if (stroke) element.setAttribute('stroke', stroke);
}

function forceGroupPaint(doc: Document, selector: string, color: string) {
  doc.querySelectorAll(selector).forEach((group) => {
    group.querySelectorAll('[fill], [stroke]').forEach((element) => {
      const fill = element.getAttribute('fill');
      const stroke = element.getAttribute('stroke');
      if (fill && !shouldSkipPaint(fill)) element.setAttribute('fill', color);
      if (stroke && !shouldSkipPaint(stroke)) element.setAttribute('stroke', color);
    });
  });
}

function applyTheme(doc: Document, theme: CoverTheme) {
  doc.querySelectorAll('[fill], [stroke]').forEach((element) => applyPaintToElement(element, theme));
  forceGroupPaint(doc, '[id*="cor_primaria"], [id*="Cor_primaria"], [id*="primary"]', theme.current.primary);
  forceGroupPaint(doc, '[id*="cor_secund"], [id*="Cor_secund"], [id*="secondary"]', theme.current.secondary);
}

function setHref(element: Element | null, href: string) {
  if (!element || !href) return;
  element.setAttribute('href', href);
  element.setAttributeNS(XLINK_NS, 'xlink:href', href);
}

function getSvgSize(doc: Document) {
  const svg = doc.querySelector('svg');
  const viewBox = svg?.getAttribute('viewBox')?.split(/\s+/).map(Number);
  if (viewBox?.length === 4 && viewBox.every(Number.isFinite)) {
    return { width: viewBox[2], height: viewBox[3] };
  }

  return {
    width: parseFloat(svg?.getAttribute('width') || '595'),
    height: parseFloat(svg?.getAttribute('height') || '842'),
  };
}

function getOrCreateDefs(doc: Document) {
  const svg = doc.querySelector('svg');
  let defs = doc.querySelector('defs');
  if (!defs) {
    defs = doc.createElementNS(SVG_NS, 'defs');
    svg?.appendChild(defs);
  }
  return defs;
}

function findPhotoGroup(doc: Document) {
  return Array.from(doc.querySelectorAll('[id]')).find((element) => {
    const id = element.getAttribute('id')?.toLowerCase() || '';
    return id.includes('foto_aqui') || id.includes('foto aqui') || id.includes('cover-photo');
  }) || null;
}

function getPatternIdFromFill(fill: string | null) {
  const match = fill?.match(/url\(#([^\)]+)\)/);
  return match?.[1] || null;
}

function findPhotoPatternTarget(doc: Document, patternId: string | null) {
  if (!patternId) return null;
  const pattern = doc.getElementById(patternId);
  if (!pattern) return null;

  const directImage = pattern.querySelector('image');
  if (directImage) return directImage;

  const use = pattern.querySelector('use');
  const href = use?.getAttribute('href') || use?.getAttribute('xlink:href');
  const referencedId = href?.startsWith('#') ? href.slice(1) : null;
  return referencedId ? doc.getElementById(referencedId) : null;
}

function findPhotoShape(doc: Document) {
  const photoGroup = findPhotoGroup(doc);
  const shape = photoGroup?.querySelector('[fill^="url(#pattern"]')
    || photoGroup?.querySelector('[fill^="url(#"]')
    || doc.querySelector('[fill^="url(#pattern"]')
    || doc.querySelector('[fill^="url(#"]');

  return { photoGroup, shape };
}

function applyTransform(element: Element, transform?: TransformConfig) {
  if (!transform) return;
  const width = parseFloat(element.getAttribute('width') || '595');
  const height = parseFloat(element.getAttribute('height') || '842');
  const cx = width / 2;
  const cy = height / 2;
  element.setAttribute('transform', `translate(${transform.x}, ${transform.y}) translate(${cx}, ${cy}) scale(${transform.zoom}) rotate(${transform.rotate}) translate(${-cx}, ${-cy})`);
}

function hidePhotoIcon(doc: Document) {
  doc.querySelectorAll('[id*="foto_aqui_icon"], [id*="foto aqui_icon"], [id*="Foto_aqui_icon"]').forEach((element) => {
    element.setAttribute('display', 'none');
  });
}

function insertPhotoInPlaceholder(doc: Document, imageUrl: string, transform?: TransformConfig) {
  const { photoGroup, shape } = findPhotoShape(doc);
  const patternId = getPatternIdFromFill(shape?.getAttribute('fill') || null);
  const patternTarget = findPhotoPatternTarget(doc, patternId);

  if (patternTarget) {
    setHref(patternTarget, imageUrl);
  }

  if (!shape || !photoGroup) {
    if (patternTarget) {
      patternTarget.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      applyTransform(patternTarget, transform);
      hidePhotoIcon(doc);
    }
    return;
  }

  const d = shape.getAttribute('d');
  if (!d) {
    if (patternTarget) {
      patternTarget.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      applyTransform(patternTarget, transform);
      hidePhotoIcon(doc);
    }
    return;
  }

  const clipId = 'cover-photo-clip';
  const defs = getOrCreateDefs(doc);
  defs.querySelector(`#${clipId}`)?.remove();

  const clipPath = doc.createElementNS(SVG_NS, 'clipPath');
  clipPath.setAttribute('id', clipId);
  const clipShape = doc.createElementNS(SVG_NS, 'path');
  clipShape.setAttribute('d', d);
  clipShape.setAttribute('clip-rule', shape.getAttribute('clip-rule') || 'evenodd');
  clipShape.setAttribute('fill-rule', shape.getAttribute('fill-rule') || 'evenodd');
  clipPath.appendChild(clipShape);
  defs.appendChild(clipPath);

  const size = getSvgSize(doc);
  const image = doc.createElementNS(SVG_NS, 'image');
  image.setAttribute('id', 'cover-photo-image');
  image.setAttribute('data-pdf-role', 'cover-photo-image');
  image.setAttribute('x', '0');
  image.setAttribute('y', '0');
  image.setAttribute('width', String(size.width));
  image.setAttribute('height', String(size.height));
  image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  image.setAttribute('clip-path', `url(#${clipId})`);
  setHref(image, imageUrl);
  applyTransform(image, transform);

  shape.setAttribute('id', 'cover-photo-shape');
  shape.setAttribute('data-pdf-role', 'cover-photo-shape');
  shape.setAttribute('display', 'none');
  photoGroup.setAttribute('id', 'cover-photo');
  photoGroup.setAttribute('data-pdf-role', 'cover-photo');

  const overlay = Array.from(photoGroup.children).find((child) => {
    const fill = child.getAttribute('fill') || '';
    return fill.startsWith('url(#paint') || fill.includes('linear');
  });

  photoGroup.insertBefore(image, overlay || shape.nextSibling);
  hidePhotoIcon(doc);
}

function replaceLogo(doc: Document, logoUrl?: string | null, transform?: TransformConfig) {
  if (!logoUrl) return;

  const logoText = Array.from(doc.querySelectorAll('[id]')).find((element) => {
    const id = element.getAttribute('id')?.toLowerCase() || '';
    return id.includes('logo');
  });

  if (!logoText) return;

  const image = doc.createElementNS(SVG_NS, 'image');
  image.setAttribute('id', 'company-logo');
  setHref(image, logoUrl);
  image.setAttribute('x', '32');
  image.setAttribute('y', '32');
  image.setAttribute('width', '140');
  image.setAttribute('height', '64');
  image.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  if (transform) image.setAttribute('transform', `translate(${transform.x}, ${transform.y}) scale(${transform.zoom}) rotate(${transform.rotate})`);

  logoText.setAttribute('display', 'none');
  logoText.parentNode?.appendChild(image);
}

function replaceTextContent(text: string, values: CoverValues) {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  if (!clean) return text;
  if (/nome\s+(sobrenome|do cliente)|nome do cliente|nome sobrenome/i.test(clean)) return values.clientName || clean;
  if (/0[,.]00\s*kwp|4\.95\s*kwp/i.test(clean)) return values.powerKwp || clean;
  if (/cidade\s*-?\s*estado|cidade-estado|cidade estado/i.test(clean)) return values.cityState || clean;
  if (/dd\s*\/\s*mm\s*\/\s*aa/i.test(clean)) return values.date || clean;
  if (lower === 'cliente' || lower === 'data') return clean;

  return text;
}

function applyTexts(doc: Document, values: CoverValues) {
  doc.querySelectorAll('text, tspan').forEach((element) => {
    const current = element.textContent || '';
    const next = replaceTextContent(current, values);
    if (next !== current) element.textContent = next;
  });
}

export function buildCoverSvg(svgSource: string, theme: CoverTheme, values: CoverValues = {}) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgSource, 'image/svg+xml');

  applyTheme(doc, theme);
  applyTexts(doc, values);

  if (values.coverImageUrl) {
    insertPhotoInPlaceholder(doc, values.coverImageUrl, values.coverImageTransform);
  }

  replaceLogo(doc, values.logoUrl, values.logoTransform);

  return new XMLSerializer().serializeToString(doc);
}
