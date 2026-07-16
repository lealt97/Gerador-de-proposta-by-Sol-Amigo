import { supabase } from '../supabase/client';

const OWNER_PDF_URL_TTL_SECONDS = 60 * 60;

export async function createOwnerProposalPdfUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('proposals')
    .createSignedUrl(storagePath, OWNER_PDF_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error('Error creating signed owner PDF URL:', error);
    return null;
  }

  return data.signedUrl;
}
