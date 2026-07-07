import { TransformConfig } from '../../../types/pdfModels';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

type Bounds = { x: number; y: number; width: number; height: number };

function setHref(element: Element, href: string) {
  element.setAttribute('href', href);
  element.setAttributeNS(XLINK_NS, 'xlink:href', href);
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

function getPatternId(fill: string | null) {
  return fill?.match(/url\(#([^\)]+)\)/)?.[1] || null;
}

function isPhotoElement(element: Element) {
  const id = element.getAttribute('id')?.toLowerCase() || '';
  return id.includes('foto_aqui') || id.includes('foto aqui') || id.includes('cover-photo');
}

function isShape(element: Element | null) {
  return !!element && ['path', 'rect', 'polygon', 'polyline', 'circle', 'ellipse'].includes(element.tagName.toLowerCase());
}

function findPhotoShape(doc: Document) {
  const byId = Array.from(doc.querySelectorAll('[id]')).find(isPhotoElement) || null;
  if (byId && isShape(byId) && getPatternId(byId.getAttribute('fill'))) return byId;
  const childShape = byId?.querySelector('[fill^="url(#pattern"], [fill^="url(#"]') || null;
  if (childShape) return childShape;
  return doc.querySelector('[fill^="url(#pattern"], [fill^="url(#"]');
}

function parseNumbers(value: string | null) {
  if (!value) return [];
  return (value.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number).filter(Number.isFinite);
}

function boundsFromNumbers(numbers: number[]) {
  const points: Array<[number, number]> = [];
  for (let i = 0; i < numbers.length - 1; i += 2) points.push([numbers[i], numbers[i + 1]]);
  if (!points.length) return null;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  if (maxX <= minX || maxY <= minY) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function getSvgBounds(doc: Document): Bounds {
  const svg = doc.querySelector('svg');
  const viewBox = parseNumbers(svg?.getAttribute('viewBox') || null);
  if (viewBox.length >= 4) return { x: viewBox[0], y: viewBox[1], width: viewBox[2], height: viewBox[3] };
  return { x: 0, y: 0, width: 595, height: 842 };
}

function getShapeBounds(shape: Element | null, doc: Document): Bounds {
  if (!shape) return getSvgBounds(doc);

  try {
    const box = (shape as SVGGraphicsElement).getBBox?.();
    if (box?.width && box?.height) return { x: box.x, y: box.y, width: box.width, height: box.height };
  } catch {
    // Fallback for SVG parsed with DOMParser before rendering.
  }

  const tag = shape.tagName.toLowerCase();
  if (tag === 'rect') {
    const width = parseFloat(shape.getAttribute('width') || '0');
    const height = parseFloat(shape.getAttribute('height') || '0');
    if (width > 0 && height > 0) {
      return { x: parseFloat(shape.getAttribute('x') || '0'), y: parseFloat(shape.getAttribute('y') || '0'), width, height };
    }
  }

  return boundsFromNumbers(parseNumbers(shape.getAttribute(tag === 'path' ? 'd' : 'points'))) || getSvgBounds(doc);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createClipLayer(doc: Document, shape: Element, bounds: Bounds) {
  const clipId = 'clip-foto-aqui';
  doc.getElementById(clipId)?.remove();
  doc.getElementById('cover-photo-layer')?.remove();

  const defs = getOrCreateDefs(doc);
  const clipPath = doc.createElementNS(SVG_NS, 'clipPath');
  clipPath.setAttribute('id', clipId);
  clipPath.setAttribute('clipPathUnits', 'userSpaceOnUse');

  const clipShape = shape.cloneNode(true) as Element;
  clipShape.removeAttribute('id');
  clipShape.removeAttribute('fill');
  clipShape.removeAttribute('stroke');
  clipPath.appendChild(clipShape);
  defs.appendChild(clipPath);

  const layer = doc.createElementNS(SVG_NS, 'g');
  layer.setAttribute('id', 'cover-photo-layer');
  layer.setAttribute('data-pdf-role', 'cover-photo-layer');
  layer.setAttribute('data-photo-bounds', `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
  layer.setAttribute('clip-path', `url(#${clipId})`);
  shape.parentNode?.insertBefore(layer, shape.nextSibling);
  return layer;
}

function buildFrame(bounds: Bounds, transform?: TransformConfig) {
  const zoom = Math.max(1, Number(transform?.zoom ?? 1));
  const width = bounds.width * zoom;
  const height = bounds.height * zoom;
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

export function applyPhotoMask(doc: Document, imageUrl?: string | null, transform?: TransformConfig) {
  if (!imageUrl) return;

  const shape = findPhotoShape(doc);
  if (!shape) return;

  const bounds = getShapeBounds(shape, doc);
  const layer = createClipLayer(doc, shape, bounds);
  const frame = buildFrame(bounds, transform);

  const image = doc.createElementNS(SVG_NS, 'image');
  image.setAttribute('id', 'cover-photo-image');
  image.setAttribute('data-pdf-role', 'cover-photo-image');
  image.setAttribute('data-pdf-image-mode', 'mask');
  image.setAttribute('x', String(frame.x));
  image.setAttribute('y', String(frame.y));
  image.setAttribute('width', String(frame.width));
  image.setAttribute('height', String(frame.height));
  image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  if (frame.transform) image.setAttribute('transform', frame.transform);
  setHref(image, imageUrl);
  layer.appendChild(image);

  shape.setAttribute('data-pdf-role', 'cover-photo-placeholder');
  shape.setAttribute('display', 'none');
  doc.querySelectorAll('[id*="foto_aqui_icon"], [id*="foto aqui_icon"], [id*="Foto_aqui_icon"], [id*="photo_icon"], [id*="image_icon"]').forEach((element) => {
    element.setAttribute('display', 'none');
  });
}
