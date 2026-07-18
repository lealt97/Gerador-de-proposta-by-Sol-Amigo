import { TransformConfig } from '../types/pdfDesignTypes';
import { CoverTheme, applyTheme } from './colorEngine';
import { applyCoverPhoto } from './photoEngine';
import { applyLogo } from './logoEngine';
import { CoverTextValues, applyDynamicTexts } from './textEngine';
import { makeIdsUnique } from './idEngine';

export type BuildSvgTemplateInput = {
  svgSource: string;
  theme: CoverTheme;
  texts?: CoverTextValues;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  logoTransform?: TransformConfig;
  coverImageTransform?: TransformConfig;
  modelId?: string;
};

function applyStaticContrastOverrides(doc: Document) {
  const isCover06 = Boolean(
    doc.querySelector('[id="A4 - 6"], [id="capa_6"]'),
  );

  if (!isCover06) return;

  // The nominal-power value on cover 06 sits over the dark primary area.
  // Keep it pure white, like the label above it. White is intentionally
  // excluded from theme replacement so this contrast remains stable.
  doc.querySelectorAll('[data-bind="powerKwp"]').forEach((element) => {
    element.setAttribute('fill', '#FFFFFF');
    element.setAttribute('data-text-fill', '#FFFFFF');
  });
}

export function buildSvgTemplate(input: BuildSvgTemplateInput) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(input.svgSource, 'image/svg+xml');

  // Dynamic vector placeholders must be read before recoloring the template.
  // Some Figma exports, including cover 06, place the power value inside the
  // primary-color group. Applying the theme first makes that value inherit the
  // background color and the generated text becomes visually invisible.
  applyDynamicTexts(doc, input.texts || {}, input.theme.current);
  applyStaticContrastOverrides(doc);
  applyTheme(doc, input.theme);
  applyCoverPhoto(doc, input.coverImageUrl, input.coverImageTransform);
  applyLogo(doc, input.logoUrl, input.logoTransform);

  if (input.modelId) makeIdsUnique(doc, input.modelId);

  return new XMLSerializer().serializeToString(doc);
}
