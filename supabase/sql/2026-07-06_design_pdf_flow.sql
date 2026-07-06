-- Design PDF model library schema
-- Rode este arquivo no Supabase SQL Editor antes de testar a nova aba Design PDF.
-- Os presets abaixo apontam para os arquivos SVG das capas A4 do usuário.
-- Arquivos esperados em: public/pdf-assets/covers/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.pdf_cover_templates
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS default_theme JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS color_map JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS default_page_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE public.pdf_templates
ADD COLUMN IF NOT EXISTS source_template_id UUID REFERENCES public.pdf_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS neutral_color TEXT DEFAULT '#183956',
ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS logo_transform JSONB DEFAULT '{"x":0,"y":0,"scale":1,"rotate":0}'::jsonb,
ADD COLUMN IF NOT EXISTS cover_image_transform JSONB DEFAULT '{"x":0,"y":0,"scale":1,"rotate":0}'::jsonb,
ADD COLUMN IF NOT EXISTS page_config JSONB DEFAULT '{
  "pages": {
    "cover": true,
    "summary": true,
    "clientData": true,
    "technicalSystem": true,
    "financialAnalysis": true,
    "paybackChart": true,
    "equipment": true,
    "terms": true,
    "signature": true
  },
  "order": [
    "cover",
    "summary",
    "clientData",
    "technicalSystem",
    "financialAnalysis",
    "paybackChart",
    "equipment",
    "terms",
    "signature"
  ]
}'::jsonb,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pdf_templates_user_active
ON public.pdf_templates(user_id, deleted_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pdf_cover_templates_active_order
ON public.pdf_cover_templates(is_active, sort_order);

UPDATE public.pdf_templates
SET
  neutral_color = COALESCE(neutral_color, '#183956'),
  background_color = '#FFFFFF',
  theme = jsonb_build_object(
    'primary', COALESCE(primary_color, '#0E2337'),
    'secondary', COALESCE(secondary_color, '#0076DD'),
    'accent', COALESCE(accent_color, '#FACB5C'),
    'neutral', COALESCE(neutral_color, '#183956')
  )
WHERE theme = '{}'::jsonb OR theme IS NULL;

WITH seed_models(name, slug, svg_file_url, sort_order, default_theme) AS (
  VALUES
    ('A4 01 — Executivo Dourado', 'a4-01-executivo-dourado', '/pdf-assets/covers/A4 - 1.svg', 1, '{"primary":"#0A2249","secondary":"#C49133","accent":"#FACB5C","neutral":"#1F2A2A"}'::jsonb),
    ('A4 02 — Verde Institucional', 'a4-02-verde-institucional', '/pdf-assets/covers/A4 - 2.svg', 2, '{"primary":"#051225","secondary":"#AFB77D","accent":"#FACB5C","neutral":"#1E1E1E"}'::jsonb),
    ('A4 03 — Azul Comercial', 'a4-03-azul-comercial', '/pdf-assets/covers/A4 - 3.svg', 3, '{"primary":"#0051F0","secondary":"#051225","accent":"#64B0F3","neutral":"#1E1E1E"}'::jsonb),
    ('A4 04 — Marinho Solar', 'a4-04-marinho-solar', '/pdf-assets/covers/A4 - 4.svg', 4, '{"primary":"#051225","secondary":"#0051F0","accent":"#FFCC00","neutral":"#D9D9D9"}'::jsonb),
    ('A4 05 — Verde Clean', 'a4-05-verde-clean', '/pdf-assets/covers/A4 - 5.svg', 5, '{"primary":"#39B66A","secondary":"#0E2337","accent":"#FACB5C","neutral":"#D9D9D9"}'::jsonb),
    ('A4 06 — Investimento Solar', 'a4-06-investimento-solar', '/pdf-assets/covers/A4 - 6.svg', 6, '{"primary":"#051225","secondary":"#AFB77D","accent":"#FFCC00","neutral":"#1E1E1E"}'::jsonb),
    ('A4 07 — Geométrico Premium', 'a4-07-geometrico-premium', '/pdf-assets/covers/A4 - 7.svg', 7, '{"primary":"#0051F0","secondary":"#FFCC00","accent":"#FFD600","neutral":"#3A3A3C"}'::jsonb),
    ('A4 08 — Diagonal Comercial', 'a4-08-diagonal-comercial', '/pdf-assets/covers/A4 - 8.svg', 8, '{"primary":"#0051F0","secondary":"#C49133","accent":"#39B66A","neutral":"#D9D9D9"}'::jsonb),
    ('A4 09 — Orgânico Dourado', 'a4-09-organico-dourado', '/pdf-assets/covers/A4 - 9.svg', 9, '{"primary":"#C49133","secondary":"#AFB77D","accent":"#FACB5C","neutral":"#1E1E1E"}'::jsonb),
    ('A4 10 — Verde Futuro', 'a4-10-verde-futuro', '/pdf-assets/covers/A4 -10.svg', 10, '{"primary":"#15AE51","secondary":"#051225","accent":"#FFD600","neutral":"#1E1E1E"}'::jsonb)
)
INSERT INTO public.pdf_cover_templates (
  name,
  slug,
  svg_file_url,
  thumbnail_url,
  default_theme,
  color_map,
  default_page_config,
  sort_order,
  is_active
)
SELECT
  seed_models.name,
  seed_models.slug,
  seed_models.svg_file_url,
  seed_models.svg_file_url,
  seed_models.default_theme,
  '{}'::jsonb,
  '{
    "pages": {
      "cover": true,
      "summary": true,
      "clientData": true,
      "technicalSystem": true,
      "financialAnalysis": true,
      "paybackChart": true,
      "equipment": true,
      "terms": true,
      "signature": true
    },
    "order": [
      "cover",
      "summary",
      "clientData",
      "technicalSystem",
      "financialAnalysis",
      "paybackChart",
      "equipment",
      "terms",
      "signature"
    ]
  }'::jsonb,
  seed_models.sort_order,
  true
FROM seed_models
WHERE NOT EXISTS (
  SELECT 1
  FROM public.pdf_cover_templates existing
  WHERE existing.slug = seed_models.slug
);

UPDATE public.pdf_cover_templates target
SET
  name = seed_models.name,
  svg_file_url = seed_models.svg_file_url,
  thumbnail_url = seed_models.svg_file_url,
  default_theme = seed_models.default_theme,
  sort_order = seed_models.sort_order,
  is_active = true
FROM seed_models
WHERE target.slug = seed_models.slug;

UPDATE public.pdf_cover_templates
SET is_active = false
WHERE slug IS NOT NULL
  AND slug NOT IN (
    'a4-01-executivo-dourado',
    'a4-02-verde-institucional',
    'a4-03-azul-comercial',
    'a4-04-marinho-solar',
    'a4-05-verde-clean',
    'a4-06-investimento-solar',
    'a4-07-geometrico-premium',
    'a4-08-diagonal-comercial',
    'a4-09-organico-dourado',
    'a4-10-verde-futuro'
  );

NOTIFY pgrst, 'reload schema';
