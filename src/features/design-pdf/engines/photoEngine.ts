import { TransformConfig } from '../types/pdfDesignTypes';
import { Bounds, SVG_NS, clearElement, getUrlReference, parseBounds, setHref } from './svgDom';

function getImageTransform(bounds: Bounds, transform?: TransformConfig) {
  const zoom = Math.max(0.1, Number(transform?.zoom ?? 1));
  const offsetX = Number(transform?.x ?? 0);
  const offsetY = Number(transform?.y ?? 0);
  const rotate = Number(transform?.rotate ?? 0);

  const width = bounds.width * zoom;
  const height = bounds.height * zoom;
  const x = bounds.x + (bounds.width - width) / 2 + offsetX;
  const y = bounds.y + (bounds.height - height) / 2 + offsetY;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  return {
    x,
    y,
    width,
    height,
    transform: rotate ? `rotate(${rotate} ${centerX} ${centerY})` : '',
  };
}

function hidePhotoPlaceholder(doc: Document) {
  doc.querySelectorAll('[id*="foto_aqui_placeholder"], [id*="foto_aqui_icon"], [id*="foto aqui_icon"], [id*="Foto_aqui_icon"], [id*="photo_icon"], [id*="image_icon"]').forEach((element) => {
    element.setAttribute('display', 'none');
    element.setAttribute('opacity', '0');
  });
}

function moveLayerAbovePlaceholder(layer: Element) {
  const parent = layer.parentElement;
  if (!parent) return;
  if (parent.lastElementChild !== layer) parent.appendChild(layer);
}

function applyPhotoAsClipLayer(doc: Document, imageUrl?: string | null, transform?: TransformConfig) {
  if (!imageUrl) return false;
  const layer = doc.getElementById('cover-photo-layer');
  if (!layer) return false;

  const coverGroup = doc.getElementById('cover-photo') || layer.parentElement;
  const bounds = parseBounds(coverGroup?.getAttribute('data-photo-bounds') || null) || { x: 0, y: 0, width: 595, height: 842 };
  const crop = getImageTransform(bounds, transform);

  hidePhotoPlaceholder(doc);
  moveLayerAbovePlaceholder(layer);
  clearElement(layer);

  const image = doc.createElementNS(SVG_NS, 'image');
  image.setAttribute('id', 'cover-photo-image');
  image.setAttribute('data-pdf-role', 'cover-photo-image');
  image.setAttribute('data-pdf-image-mode', 'clip-layer');
  image.setAttribute('x', String(crop.x));
  image.setAttribute('y', String(crop.y));
  image.setAttribute('width', String(crop.width));
  image.setAttribute('height', String(crop.height));
  image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  image.setAttribute('display', 'block');
  image.setAttribute('opacity', '1');
  image.setAttribute('crossorigin', 'anonymous');
  if (crop.transform) image.setAttribute('transform', crop.transform);
  setHref(image, imageUrl);

  layer.appendChild(image);
  coverGroup?.setAttribute('data-photo-applied', 'true');
  return true;
}

function findLegacyPhotoShape(doc: Document) {
  const byId = Array.from(doc.querySelectorAll('[id]')).find((element) => {
    const id = element.getAttribute('id')?.toLowerCase() || '';
    return id.includes('foto_aqui') || id.includes('foto aqui') || id.includes('cover-photo');
  });

  const shape = byId?.matches('path, rect, polygon, polyline, circle, ellipse')
    ? byId
    : byId?.querySelector('[fill^="url(#pattern"], [fill^="url(#"]');

  return shape || doc.querySelector('[fill^="url(#pattern"], [fill^="url(#"]');
}

function applyPhotoAsPattern(doc: Document, imageUrl?: string | null, transform?: TransformConfig) {
  if (!imageUrl) return;

  const shape = findLegacyPhotoShape(doc);
  const patternId = getUrlReference(shape?.getAttribute('fill') || null);
  const pattern = patternId ? doc.getElementById(patternId) : null;
  if (!shape || !pattern) return;

  clearElement(pattern);
  pattern.setAttribute('patternContentUnits', 'objectBoundingBox');
  pattern.setAttribute('width', '1');
  pattern.setAttribute('height', '1');
  pattern.removeAttribute('patternTransform');

  const zoom = Math.max(0.1, Number(transform?.zoom ?? 1));
  const left = (1 - zoom) / 2 + Number(transform?.x ?? 0) / 595;
  const top = (1 - zoom) / 2 + Number(transform?.y ?? 0) / 842;
  const rotate = Number(transform?.rotate ?? 0);

  const image = doc.createElementNS(SVG_NS, 'image');
  image.setAttribute('id', 'cover-photo-image');
  image.setAttribute('data-pdf-role', 'cover-photo-image');
  image.setAttribute('data-pdf-image-mode', 'crop');
  image.setAttribute('x', String(left));
  image.setAttribute('y', String(top));
  image.setAttribute('width', String(zoom));
  image.setAttribute('height', String(zoom));
  image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  image.setAttribute('display', 'block');
  image.setAttribute('opacity', '1');
  image.setAttribute('crossorigin', 'anonymous');
  if (rotate) image.setAttribute('transform', `rotate(${rotate} 0.5 0.5)`);
  setHref(image, imageUrl);

  pattern.appendChild(image);
  shape.setAttribute('id', 'cover-photo-shape');
  shape.setAttribute('data-pdf-role', 'cover-photo-shape');
  hidePhotoPlaceholder(doc);
}

export function applyCoverPhoto(doc: Document, imageUrl?: string | null, transform?: TransformConfig) {
  const photoApplied = applyPhotoAsClipLayer(doc, imageUrl, transform);
  if (!photoApplied) applyPhotoAsPattern(doc, imageUrl, transform);
}
