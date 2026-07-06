import { supabase } from '../lib/supabase/client';
import { PdfCoverTemplate, PdfImageTransform, PdfPageConfig, PdfTemplate, PdfTheme } from '../types/pdfDesign';

export const DEFAULT_PDF_THEME: PdfTheme = {
  primary: '#0E2337',
  secondary: '#0076DD',
  accent: '#FACB5C',
  neutral: '#183956',
};

export const DEFAULT_IMAGE_TRANSFORM: PdfImageTransform = {
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
};

export const DEFAULT_PAGE_CONFIG: PdfPageConfig = {
  pages: {
    cover: true,
    summary: true,
    clientData: true,
    technicalSystem: true,
    financialAnalysis: true,
    paybackChart: true,
    equipment: true,
    terms: true,
    signature: true,
  },
  order: [
    'cover',
    'summary',
    'clientData',
    'technicalSystem',
    'financialAnalysis',
    'paybackChart',
    'equipment',
    'terms',
    'signature',
  ],
};

const normalizeTheme = (theme?: Partial<PdfTheme> | null): PdfTheme => ({
  primary: theme?.primary || DEFAULT_PDF_THEME.primary,
  secondary: theme?.secondary || DEFAULT_PDF_THEME.secondary,
  accent: theme?.accent || DEFAULT_PDF_THEME.accent,
  neutral: theme?.neutral || DEFAULT_PDF_THEME.neutral,
});

const legacyThemeFields = (theme: PdfTheme) => ({
  primary_color: theme.primary,
  secondary_color: theme.secondary,
  accent_color: theme.accent,
  neutral_color: theme.neutral,
  background_color: '#FFFFFF',
});

const buildTemplatePayload = (template: Partial<PdfTemplate>) => {
  const theme = normalizeTheme(template.theme || {
    primary: template.primary_color,
    secondary: template.secondary_color,
    accent: template.accent_color,
    neutral: template.neutral_color || undefined,
  });

  return {
    ...template,
    ...legacyThemeFields(theme),
    theme,
    logo_transform: template.logo_transform || DEFAULT_IMAGE_TRANSFORM,
    cover_image_transform: template.cover_image_transform || DEFAULT_IMAGE_TRANSFORM,
    page_config: template.page_config || DEFAULT_PAGE_CONFIG,
  };
};

export const pdfDesignService = {
  async getCoverTemplates(): Promise<PdfCoverTemplate[]> {
    const { data, error } = await supabase
      .from('pdf_cover_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('name');
      
    if (error) throw error;
    return data || [];
  },

  async getUserTemplates(userId?: string): Promise<PdfTemplate[]> {
    let query = supabase
      .from('pdf_templates')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
      
    if (error) throw error;
    return data || [];
  },

  async getTemplate(id: string): Promise<PdfTemplate | null> {
    const { data, error } = await supabase
      .from('pdf_templates')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data;
  },

  async getDefaultTemplate(userId?: string): Promise<PdfTemplate | null> {
    let query = supabase
      .from('pdf_templates')
      .select('*')
      .eq('is_default', true)
      .is('deleted_at', null)
      .limit(1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();
      
    if (error) throw error;
    return data;
  },

  async addTemplateFromPreset(preset: PdfCoverTemplate, userId: string): Promise<PdfTemplate> {
    const theme = normalizeTheme(preset.default_theme);

    const template = buildTemplatePayload({
      user_id: userId,
      name: preset.name,
      cover_template_id: preset.id,
      source_template_id: null,
      logo_url: null,
      cover_photo_url: null,
      page_config: preset.default_page_config || DEFAULT_PAGE_CONFIG,
      is_default: false,
      theme,
    });

    const { data, error } = await supabase
      .from('pdf_templates')
      .insert([template])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async saveTemplate(template: Partial<PdfTemplate>): Promise<PdfTemplate> {
    const isNew = !template.id;
    const payload = buildTemplatePayload(template);
    let data;
    
    if (payload.is_default && payload.user_id) {
      await supabase
        .from('pdf_templates')
        .update({ is_default: false })
        .eq('user_id', payload.user_id)
        .is('deleted_at', null)
        .neq('id', payload.id || '00000000-0000-0000-0000-000000000000');
    }

    if (isNew) {
      const { data: insertData, error } = await supabase
        .from('pdf_templates')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      data = insertData;
    } else {
      const { data: updateData, error } = await supabase
        .from('pdf_templates')
        .update({
          ...payload,
          updated_at: new Date().toISOString()
        })
        .eq('id', template.id)
        .select()
        .single();
      if (error) throw error;
      data = updateData;
    }

    return data;
  },

  async renameTemplate(id: string, name: string): Promise<PdfTemplate> {
    const { data, error } = await supabase
      .from('pdf_templates')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  
  async duplicateTemplate(template: PdfTemplate, userId: string): Promise<PdfTemplate> {
    const theme = normalizeTheme(template.theme || {
      primary: template.primary_color,
      secondary: template.secondary_color,
      accent: template.accent_color,
      neutral: template.neutral_color || undefined,
    });

    const { id, created_at, updated_at, deleted_at, ...copyable } = template;
    const payload = buildTemplatePayload({
      ...copyable,
      user_id: userId,
      name: `${template.name || 'Modelo'} (Cópia)`,
      source_template_id: id,
      is_default: false,
      theme,
      logo_transform: template.logo_transform || DEFAULT_IMAGE_TRANSFORM,
      cover_image_transform: template.cover_image_transform || DEFAULT_IMAGE_TRANSFORM,
      page_config: template.page_config || DEFAULT_PAGE_CONFIG,
    });

    const { data, error } = await supabase
      .from('pdf_templates')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async setDefaultTemplate(id: string, userId?: string): Promise<void> {
    const current = userId ? null : await this.getTemplate(id);
    const ownerId = userId || current?.user_id;

    if (ownerId) {
      await supabase
        .from('pdf_templates')
        .update({ is_default: false })
        .eq('user_id', ownerId)
        .is('deleted_at', null);
    }

    const { error } = await supabase
      .from('pdf_templates')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async softDeleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('pdf_templates')
      .update({
        deleted_at: new Date().toISOString(),
        is_default: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  async uploadAsset(file: File, folder: string, userId?: string): Promise<string> {
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const safeFolder = userId ? `${userId}/${folder}` : folder;
    const filePath = `${safeFolder}/${fileName}`;

    const { error } = await supabase.storage
      .from('pdf-assets')
      .upload(filePath, file);

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('pdf-assets')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  }
};
