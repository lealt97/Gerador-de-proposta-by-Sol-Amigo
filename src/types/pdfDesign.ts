export interface PdfCoverTemplate {
  id: string;
  name: string;
  svg_file_url: string;
  thumbnail_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PdfTemplate {
  id: string;
  user_id: string;
  name: string;
  cover_template_id: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  logo_url: string | null;
  cover_photo_url: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
