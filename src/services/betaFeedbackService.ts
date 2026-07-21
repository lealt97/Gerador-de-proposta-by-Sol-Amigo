import { supabase } from '../lib/supabase/client';

export type BetaFeedbackCategory =
  | 'onboarding'
  | 'proposal'
  | 'pdf'
  | 'billing'
  | 'usability'
  | 'bug'
  | 'other';

export const betaFeedbackService = {
  async submit(input: {
    accountId: string;
    category: BetaFeedbackCategory;
    score?: number | null;
    message: string;
    context?: Record<string, unknown>;
  }) {
    const { data, error } = await supabase
      .from('beta_feedback')
      .insert({
        account_id: input.accountId,
        category: input.category,
        score: input.score ?? null,
        message: input.message.trim(),
        context: input.context || {},
      })
      .select('id, created_at')
      .single();

    if (error) throw error;
    return data;
  },
};
