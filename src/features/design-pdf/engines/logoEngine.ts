import { TransformConfig } from '../types/pdfDesignTypes';
import { SVG_NS, setHref } from './svgDom';
import {
  COVER_06_LOGO_SLOT,
  DEFAULT_LOGO_SLOT,
  LOGO_PRESERVE_ASPECT_RATIO,
} from './logoLayout';

type LogoPlacement = {
  baseX: number;
  baseY: number;
  width: number;
  height: number;
  tagName: string;
  parent: Element;
  placeholder?: Element;
};

function getLogoBasePosition(logoElement: Element): Omit<LogoPlacement, 'parent' | 'placeholder'> {
  let baseX = 32;
  let baseY = 32;

  if (logoElement.hasAttribute('x') && logoElement.getAttribute('x')) {
    baseX = Number(logoElement.getAttribute('x'));
  }
  if (logoElement.hasAttribute('y') && logoElement.getAttribute('y')) {
    baseY = Number(logoElement.getAttribute('y'));
  }

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

  return {
    baseX,
    baseY,
    width: DEFAULT_LOGO_SLOT.width,
    height: DEFAULT_LOGO_SLOT.height,
    tagName,
  };
}

function findLogoPlaceholder(doc: Document) {
  return Array.from(doc.querySelectorAll('[data-logo-slot], [id]')).find((element) => {
    if (element.hasAttribute('data-logo-slot')) return true;
    const id = element.getAttribute('id')?.toLowerCase() || '';
    return id.includes('logo');
  });
}

function getFallbackPlacement(doc: Document): LogoPlacement | null {
  const cover06 = doc.querySelector('[id="A4 - 6"], [id="capa_6"]');
  if (!cover06) return null;

  // Cover 06 has no logo placeholder in the original Figma SVG. The area from
  // x=24 to x=164 and y=34 to y=104 is free, above the proposal title and to
  // the left of the photo mask. It behaves as a virtual logo slot and still
  // honors the user's position, zoom and rotation controls.
  return {
    baseX: 24,
    baseY: 34,
    width: COVER_06_LOGO_SLOT.width,
    height: COVER_06_LOGO_SLOT.height,
    tagName: 'virtual-slot',
    parent: cover06,
  };
}

function resolveLogoPlacement(doc: Document): LogoPlacement | null {
  const placeholder = findLogoPlaceholder(doc);
  if (placeholder) {
    const base = getLogoBasePosition(placeholder);
    return {
      ...base,
      parent: placeholder.parentElement || doc.documentElement,
      placeholder,
    };
  }

  return getFallbackPlacement(doc);
}

export function applyLogo(doc: Document, logoUrl?: string | null, transform?: TransformConfig) {
  if (!logoUrl) return;

  const placement = resolveLogoPlacement(doc);
  if (!placement) return;

  placement.placeholder?.setAttribute('display', 'none');

  const image = doc.createElementNS(SVG_NS, 'image');
  image.setAttribute('id', 'company-logo-image');
  image.setAttribute('data-generated-logo', 'true');
  setHref(image, logoUrl);
  image.setAttribute('x', '0');
  image.setAttribute('y', '0');
  image.setAttribute('width', String(placement.width));
  image.setAttribute('height', String(placement.height));
  image.setAttribute('preserveAspectRatio', LOGO_PRESERVE_ASPECT_RATIO);
  image.setAttribute('display', 'block');
  image.setAttribute('opacity', '1');
  image.setAttribute('crossorigin', 'anonymous');
  image.setAttribute('pointer-events', 'none');

  const cx = placement.width / 2;
  const cy = placement.height / 2;
  const t = transform || { x: 0, y: 0, zoom: 1, rotate: 0 };
  const dx = placement.baseX + (t.x || 0);
  let dy = placement.baseY + (t.y || 0);

  // Preserve the historical vertical adjustment used by path placeholders.
  // The virtual slot on cover 06 already has its final top-left coordinate.
  if (placement.tagName === 'path') {
    dy = placement.baseY - 20 + (t.y || 0);
  }

  const transformStr = [
    `translate(${dx}, ${dy})`,
    `translate(${cx}, ${cy})`,
    `scale(${t.zoom || 1})`,
    `rotate(${t.rotate || 0})`,
    `translate(${-cx}, ${-cy})`,
  ].join(' ');

  image.setAttribute('transform', transformStr);
  placement.parent.appendChild(image);
}
