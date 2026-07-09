import { TransformConfig } from '../types/pdfDesignTypes';
import { SVG_NS, setHref } from './svgDom';

function getLogoBasePosition(logoElement: Element) {
  let baseX = 32;
  let baseY = 32;

  if (logoElement.hasAttribute('x') && logoElement.getAttribute('x')) baseX = Number(logoElement.getAttribute('x'));
  if (logoElement.hasAttribute('y') && logoElement.getAttribute('y')) baseY = Number(logoElement.getAttribute('y'));

  const tagName = logoElement.tagName.toLowerCase();
  if (tagName === 'path') {
    const d = logoElement.getAttribute('d');
    const match = d?.match(/M\s*([\d.-]+)[\s,]+([\d.-]+)/i);
    if (match) {
      baseX = Number(match[1]);
      baseY = Number(match[2]);
    }
  } else if (logoElement.hasAttribute('points')) {
    const pts = logoElement.getAttribute('points')?.trim().split(/[\s,]+/);
    if (pts && pts.length >= 2) {
      baseX = Number(pts[0]);
      baseY = Number(pts[1]);
    }
  }

  const transformAttr = logoElement.getAttribute('transform');
  const translate = transformAttr?.match(/translate\(\s*([\d.-]+)[\s,]+([\d.-]+)\s*\)/i);
  if (translate) {
    baseX += Number(translate[1]);
    baseY += Number(translate[2]);
  }

  return { baseX, baseY, tagName };
}

export function applyLogo(doc: Document, logoUrl?: string | null, transform?: TransformConfig) {
  if (!logoUrl) return;

  const logoElement = Array.from(doc.querySelectorAll('[id]')).find((element) => {
    const id = element.getAttribute('id')?.toLowerCase() || '';
    return id.includes('logo');
  });
  if (!logoElement) return;

  const { baseX, baseY, tagName } = getLogoBasePosition(logoElement);
  logoElement.setAttribute('display', 'none');

  const image = doc.createElementNS(SVG_NS, 'image');
  image.setAttribute('id', 'company-logo-image');
  setHref(image, logoUrl);
  image.setAttribute('x', '0');
  image.setAttribute('y', '0');
  image.setAttribute('width', '140');
  image.setAttribute('height', '64');
  image.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  image.setAttribute('display', 'block');
  image.setAttribute('opacity', '1');
  image.setAttribute('crossorigin', 'anonymous');

  const width = 140;
  const height = 64;
  const cx = width / 2;
  const cy = height / 2;
  const t = transform || { x: 0, y: 0, zoom: 1, rotate: 0 };
  const dx = baseX + (t.x || 0);
  let dy = baseY + (t.y || 0);
  if (tagName === 'path') dy = baseY - 20 + (t.y || 0);

  const transformStr = `translate(${dx}, ${dy}) translate(${cx}, ${cy}) scale(${t.zoom || 1}) rotate(${t.rotate || 0}) translate(${-cx}, ${-cy})`;
  image.setAttribute('transform', transformStr);
  logoElement.parentNode?.appendChild(image);
}
