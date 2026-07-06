export type PdfTheme = {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
};

export type PdfImageTransform = {
  x: number;
  y: number;
  scale: number;
  rotate: number;
};

export type PdfPageConfig = {
  pages: Record<string, boolean>;
  order: string[];
};

export interface PdfCoverTemplate {
  id: string;
  name: string;
  slug?: string | null;
  svg_file_url: string;
  thumbnail_url: string | null;
  default_theme?: PdfTheme | null;
  color_map?: Record<string, string> | null;
  default_page_config?: PdfPageConfig | null;
  sort_order?: number | null;
  is_active: boolean;
  created_at: string;
}

export interface PdfTemplate {
  id: string;
  user_id: string;
  name: string;
  cover_template_id: string | null;
  source_template_id?: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  neutral_color?: string | null;
  theme?: PdfTheme | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  logo_transform?: PdfImageTransform | null;
  cover_image_transform?: PdfImageTransform | null;
  page_config?: PdfPageConfig | null;
  is_default: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}
