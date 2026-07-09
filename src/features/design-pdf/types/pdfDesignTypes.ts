import type { TransformConfig } from '../../../types/pdfModels';

export type {
  PdfTemplatePreset,
  PdfTheme,
  TransformConfig,
  PdfPageConfig,
  PdfUserModel,
} from '../../../types/pdfModels';

export interface DesignPdfTexts {
  clientName?: string;
  powerKwp?: string;
  cityState?: string;
  date?: string;
}

export interface DesignPdfAssetInput {
  url?: string | null;
  transform?: TransformConfig;
}
