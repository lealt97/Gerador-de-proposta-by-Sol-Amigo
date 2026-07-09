export const SVG_NS = 'http://www.w3.org/2000/svg';
export const XLINK_NS = 'http://www.w3.org/1999/xlink';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function setHref(element: Element, href: string) {
  element.setAttribute('href', href);
  element.setAttributeNS(XLINK_NS, 'xlink:href', href);
}

export function clearElement(element: Element) {
  while (element.firstChild) element.removeChild(element.firstChild);
}

export function getUrlReference(value: string | null) {
  const match = value?.match(/url\(#([^\)]+)\)/);
  return match?.[1] || null;
}

export function parseBounds(value: string | null): Bounds | null {
  if (!value) return null;
  const [x, y, width, height] = value.trim().split(/[\s,]+/).map(Number);
  if ([x, y, width, height].some(Number.isNaN)) return null;
  return { x, y, width, height };
}
