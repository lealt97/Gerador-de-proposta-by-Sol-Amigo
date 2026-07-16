import { PdfTheme, TransformConfig } from '../../../types/pdfModels';
import { buildSvgTemplate } from '../../../features/design-pdf/engines/svgTemplateEngine';
import { applyCoverDataOverlay } from './coverDataOverlay';

export type CoverValues = {
  clientName?: string;
  clientDocument?: string;
  powerKwp?: string;
  cityState?: string;
  date?: string;
  validityText?: string;
  proposalCode?: string;
  companyName?: string;
  sellerName?: string;
  systemType?: string;
  investment?: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  coverImageTransform?: TransformConfig;
  logoTransform?: TransformConfig;
};

type CoverTheme = {
  current: PdfTheme;
  original?: PdfTheme;
};

export function buildCoverSvg(
  svgSource: string,
  theme: CoverTheme,
  values: CoverValues = {},
  modelId?: string,
  presetId?: string,
) {
  const svgWithEditableTexts = buildSvgTemplate({
    svgSource,
    theme,
    texts: {
      clientName: values.clientName,
      clientDocument: values.clientDocument,
      powerKwp: values.powerKwp,
      cityState: values.cityState,
      date: values.date,
      validityText: values.validityText,
      proposalCode: values.proposalCode,
      companyName: values.companyName,
      sellerName: values.sellerName,
      systemType: values.systemType,
      investment: values.investment,
    },
    logoUrl: values.logoUrl,
    coverImageUrl: values.coverImageUrl,
    logoTransform: values.logoTransform,
    coverImageTransform: values.coverImageTransform,
    modelId,
  });

  return applyCoverDataOverlay(
    svgWithEditableTexts,
    presetId,
    {
      clientName: values.clientName,
      powerKwp: values.powerKwp,
      cityState: values.cityState,
      date: values.date,
      validityText: values.validityText,
    },
    theme.current,
  );
}
