import { TransformConfig } from '../../../types/pdfModels';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

type Bounds = { x: number; y: number; width: number; height: number };

const IMAGE_ASPECT_RATIO = 16 / 9;

function setHref(element: Element, href: string) {
  element.setAttribute('href', href);
  element.setAttributeNS(XLINK_NS, 'xlink:href', href);
}

function parseNumbers(value: string | null) {
  if (!value) return [];
  return (value.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number).filter(Number.isFinite);
}

function getSvgBounds(doc: Document): Bounds {
  const svg = doc.querySelector('svg');
  const viewBox = parseNumbers(svg?.getAttribute('viewBox') || null);
  if (viewBox.length >= 4) return { x: viewBox[0], y: viewBox[1], width: viewBox[2], height: viewBox[3] };
  return { x: 0, y: 0, width: 595, height: 842 };
}

function getOrCreateDefs(doc: Document) {
  let defs = doc.querySelector('defs');
  if (!defs) {
    defs = doc.createElementNS(SVG_NS, 'defs');
    doc.querySelector('svg')?.appendChild(defs);
  }
  return defs;
}

function getPatternId(fill: string | null) {
  return fill?.match(/url\(#([^\)]+)\)/)?.[1] || null;
}

function isPhotoId(element: Element) {
  const id = element.getAttribute('id')?.toLowerCase() || '';
  return id.includes('foto_aqui') || id.includes('foto aqui') || id.includes('cover-photo');
}

function isShape(element: Element | null) {
  return !!element && ['path', 'rect', 'polygon', 'polyline', 'circle', 'ellipse'].includes(element.tagName.toLowerCase());
}

function findPhotoShape(doc: Document) {
  const byId = Array.from(doc.querySelectorAll('[id]')).find(isPhotoId) || null;
  if (byId && isShape(byId)) return byId;
  const child = byId?.querySelector('[fill^="url(#pattern"], [fill^="url(#"]') || null;
  if (child) return child;
  return doc.querySelector('[fill^="url(#pattern"], [fill^="url(#"]');
}

function boundsFromPairs(values: number[]) {
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < values.length - 1; i += 2) pairs.push([values[i], values[i + 1]]);
  if (!pairs.length) return null;
  const xs = pairs.map(([x]) => x);
  const ys = pairs.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  if (maxX <= minX || maxY <= minY) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function getShapeBounds(shape: Element | null, doc: Document): Bounds {
  if (!shape) return getSvgBounds(doc);
  const tag = shape.tagName.toLowerCase();
  if (tag === 'rect') {
    const width = parseFloat(shape.getAttribute('width') || '0');
    const height = parseFloat(shape.getAttribute('height') || '0');
    if (width > 0 && height > 0) {
      return { x: parseFloat(shape.getAttribute('x') || '0'), y: parseFloat(shape.getAttribute('y') || '0'), width, height };
    }
  }
  return boundsFromPairs(parseNumbers(shape.getAttribute(tag === 'path' ? 'd' : 'points'))) || getSvgBounds(doc);
}

function clearPatternFill(doc: Document, shape: Element) {
  const patternId = getPatternId(shape.getAttribute('fill'));
  if (patternId) doc.getElementById(patternId)?.setAttribute('data-pdf-disabled', 'true');
  shape.setAttribute('data-pdf-role', 'cover-photo-placeholder');
  shape.setAttribute('display', 'none');
}

function makeClipLayer(doc: Document, shape: Element, bounds: Bounds) {
  const clipId = 'clip-foto-aqui';
  doc.getElementById(clipId)?.remove();
  doc.getElementById('cover-photo-layer')?.remove();

  const clipPath = doc.createElementNS(SVG_NS, 'clipPath');
  clipPath.setAttribute('id', clipId);
  clipPath.setAttribute('clipPathUnits', 'userSpaceOnUse');

  const cloned = shape.cloneNode(true) as Element;
  cloned.removeAttribute('id');
  cloned.removeAttribute('fill');
  cloned.removeAttribute('stroke');
  cloned.removeAttribute('display');
  clipPath.appendChild(cloned);
  getOrCreateDefs(doc).appendChild(clipPath);

  const layer = doc.createElementNS(SVG_NS, 'g');
  layer.setAttribute('id', 'cover-photo-layer');
  layer.setAttribute('data-pdf-role', 'cover-photo-layer');
  layer.setAttribute('clip-path', `url(#${clipId})`);
  layer.setAttribute('data-photo-bounds', `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
  shape.parentNode?.insertBefore(layer, shape.nextSibling);
  return layer;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildImageFrame(bounds: Bounds, transform?: TransformConfig) {
  const zoom = Math.max(1, Number(transform?.zoom ?? 1));
  const boxRatio = bounds.width / bounds.height;
  let width: number;
  let height: number;

  if (boxRatio > IMAGE_ASPECT_RATIO) {
    height = bounds.height;
    width = height * IMAGE_ASPECT_RATIO;
  } else {
    width = bounds.width;
    height = width / IMAGE_ASPECT_RATIO;
  }

  width *= zoom;
  height *= zoom;

  let x = bounds.x + (bounds.width - width) / 2;
  let y = bounds.y + (bounds.height - height) / 2;

  if (zoom > 1) {
    x += (Number(transform?.x ?? 0) / 595) * bounds.width;
    y += (Number(transform?.y ?? 0) / 842) * bounds.height;
    x = clamp(x, bounds.x + bounds.width - width, bounds.x);
    y = clamp(y, bounds.y + bounds.height - height, bounds.y);
  }

  const rotate = Number(transform?.rotate ?? 0);
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  return { x, y, width, height, transform: rotate ? `rotate(${rotate} ${cx} ${cy})` : '' };
}

export function applyCoverPhotoClip(doc: Document, imageUrl?: string | null, transform?: TransformConfig) {
  if (!imageUrl) return;
  const shape = findPhotoShape(doc);
  if (!shape) return;

  const bounds = getShapeBounds(shape, doc);
  const layer = makeClipLayer(doc, shape, bounds);
  const frame = buildImageFrame(bounds, transform);

  const image = doc.createElementNS(SVG_NS, 'image');
  image.setAttribute('id', 'cover-photo-image');
  image.setAttribute('data-pdf-role', 'cover-photo-image');
  image.setAttribute('x', String(frame.x));
  image.setAttribute('y', String(frame.y));
  image.setAttribute('width', String(frame.width));
  image.setAttribute('height', String(frame.height));
  image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  if (frame.transform) image.setAttribute('transform', frame.transform);
  setHref(image, imageUrl);
  layer.appendChild(image);

  clearPatternFill(doc, shape);
  doc.querySelectorAll('[id*="foto_aqui_icon"], [id*="foto aqui_icon"], [id*="Foto_aqui_icon"], [id*="photo_icon"], [id*="image_icon"]').forEach((element) => {
    element.setAttribute('display', 'none');
  });
}
