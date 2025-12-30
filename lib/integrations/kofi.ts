/**
 * Ko-fi Integration
 * Phase 13: Webhook handling, supporter verification, badge assignment
 */

import { awardBadge } from '@/lib/db/badges';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface KofiWebhookPayload {
  verification_token: string;
  message_id: string;
  timestamp: string;
  type: KofiTransactionType;
  is_public: boolean;
  from_name: string;
  message: string;
  amount: string;
  url: string;
  email: string;
  currency: string;
  is_subscription_payment: boolean;
  is_first_subscription_payment: boolean;
  kofi_transaction_id: string;
  shop_items: KofiShopItem[] | null;
  tier_name: string | null;
  shipping: KofiShipping | null;
}

export type KofiTransactionType = 'Donation' | 'Subscription' | 'Commission' | 'Shop Order';

export interface KofiShopItem {
  direct_link_code: string;
  variation_name: string;
  quantity: number;
}

export interface KofiShipping {
  full_name: string;
  street_address: string;
  city: string;
  state_or_province: string;
  postal_code: string;
  country: string;
  country_code: string;
  telephone: string;
}

export interface SupporterRecord {
  id: string;
  user_id: string | null;
  kofi_email: string;
  from_name: string;
  tier: SupporterTier;
  total_amount: number;
  currency: string;
  is_active: boolean;
  subscription_start: string | null;
  subscription_end: string | null;
  last_payment_at: string;
  transaction_count: number;
  created_at: string;
  updated_at: string;
}

export type SupporterTier = 'one_time' | 'coffee' | 'supporter' | 'patron' | 'champion';

// ============================================================================
// TIER CONFIGURATION
// ============================================================================

export const SUPPORTER_TIERS: Record<
  SupporterTier,
  {
    name: string;
    minAmount: number;
    badge: string;
    color: string;
    perks: string[];
  }
> = {
  one_time: {
    name: 'Supporter',
    minAmount: 1,
    badge: '☕',
    color: '#78716c',
    perks: ['Supporter badge on profile'],
  },
  coffee: {
    name: 'Coffee Buddy',
    minAmount: 5,
    badge: '☕',
    color: '#a16207',
    perks: ['Coffee badge on profile', 'Thank you mention'],
  },
  supporter: {
    name: 'Monthly Supporter',
    minAmount: 5,
    badge: '💝',
    color: '#ec4899',
    perks: ['Supporter badge', 'Ad-free experience', 'Early access to features'],
  },
  patron: {
    name: 'Patron',
    minAmount: 15,
    badge: '👑',
    color: '#f59e0b',
    perks: ['Patron badge', 'All supporter perks', 'Discord access', 'Behind the scenes updates'],
  },
  champion: {
    name: 'Champion',
    minAmount: 50,
    badge: '🏆',
    color: '#a855f7',
    perks: [
      'Champion badge',
      'All patron perks',
      'Feature request priority',
      'Name in credits',
      'Direct support line',
    ],
  },
};

// ============================================================================
// WEBHOOK VERIFICATION
// ============================================================================

/**
 * Verify Ko-fi webhook signature
 */
export function verifyKofiWebhook(payload: KofiWebhookPayload): boolean {
  const verificationToken = process.env.KOFI_VERIFICATION_TOKEN;

  if (!verificationToken) {
    logger.error('[Ko-fi] Verification token not configured');
    return false;
  }

  return payload.verification_token === verificationToken;
}

// ============================================================================
// WEBHOOK PROCESSING
// ============================================================================

/**
 * Process Ko-fi webhook
 */
export async function processKofiWebhook(payload: KofiWebhookPayload): Promise<{
  success: boolean;
  message: string;
  supporterId?: string;
}> {
  logger.info('[Ko-fi] Processing webhook', {
    type: payload.type,
    transactionId: payload.kofi_transaction_id,
    email: payload.email,
  });

  // Verify the webhook
  if (!verifyKofiWebhook(payload)) {
    logger.warn('[Ko-fi] Invalid verification token');
    return { success: false, message: 'Invalid verification token' };
  }

  const supabase = await createServiceClient();

  try {
    // Check if transaction already processed
    const { data: existingTx } = await supabase
      .from('kofi_transactions')
      .select('id')
      .eq('kofi_transaction_id', payload.kofi_transaction_id)
      .single();

    if (existingTx) {
      logger.info('[Ko-fi] Transaction already processed', {
        transactionId: payload.kofi_transaction_id,
      });
      return { success: true, message: 'Transaction already processed' };
    }

    // Find user by email
    const { data: userByEmail } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', payload.email.toLowerCase())
      .single();

    // Calculate tier
    const amount = parseFloat(payload.amount);
    const tier = determineTier(payload, amount);

    // Record transaction
    const { error: txError } = await supabase
      .from('kofi_transactions')
      .insert({
        kofi_transaction_id: payload.kofi_transaction_id,
        user_id: userByEmail?.id || null,
        from_name: payload.from_name,
        email: payload.email.toLowerCase(),
        type: payload.type,
        amount,
        currency: payload.currency,
        message: payload.message,
        is_public: payload.is_public,
        is_subscription: payload.is_subscription_payment,
        is_first_subscription: payload.is_first_subscription_payment,
        tier_name: payload.tier_name,
        raw_payload: payload,
        processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (txError) {
      logger.error('[Ko-fi] Failed to record transaction', txError);
      throw txError;
    }

    // Update or create supporter record
    const supporter = await upsertSupporter({
      userId: userByEmail?.id || null,
      email: payload.email.toLowerCase(),
      fromName: payload.from_name,
      amount,
      currency: payload.currency,
      isSubscription: payload.is_subscription_payment,
      isFirstSubscription: payload.is_first_subscription_payment,
      tier,
    });

    // Award badges if user is linked
    if (userByEmail?.id) {
      await awardSupporterBadges(userByEmail.id, tier, amount);
    }

    logger.info('[Ko-fi] Webhook processed successfully', {
      transactionId: payload.kofi_transaction_id,
      supporterId: supporter.id,
      tier,
    });

    return {
      success: true,
      message: 'Webhook processed successfully',
      supporterId: supporter.id,
    };
  } catch (error) {
    logger.error('[Ko-fi] Webhook processing failed', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// SUPPORTER MANAGEMENT
// ============================================================================

/**
 * Determine supporter tier based on payment
 */
function determineTier(payload: KofiWebhookPayload, amount: number): SupporterTier {
  // Subscription tiers
  if (payload.is_subscription_payment) {
    if (amount >= SUPPORTER_TIERS.champion.minAmount) return 'champion';
    if (amount >= SUPPORTER_TIERS.patron.minAmount) return 'patron';
    return 'supporter';
  }

  // One-time donation tiers
  if (amount >= SUPPORTER_TIERS.coffee.minAmount) return 'coffee';
  return 'one_time';
}

/**
 * Create or update supporter record
 */
async function upsertSupporter(options: {
  userId: string | null;
  email: string;
  fromName: string;
  amount: number;
  currency: string;
  isSubscription: boolean;
  isFirstSubscription: boolean;
  tier: SupporterTier;
}): Promise<SupporterRecord> {
  const { userId, email, fromName, amount, currency, isSubscription, isFirstSubscription, tier } =
    options;

  const supabase = await createServiceClient();

  // Check for existing supporter record
  const { data: existing } = await supabase
    .from('supporters')
    .select('*')
    .eq('kofi_email', email)
    .single();

  if (existing) {
    // Update existing record
    const newTotalAmount = existing.total_amount + amount;
    const newTransactionCount = existing.transaction_count + 1;

    // Upgrade tier if needed
    const newTier = getHighestTier(existing.tier as SupporterTier, tier);

    const { data: updated, error } = await supabase
      .from('supporters')
      .update({
        user_id: userId || existing.user_id,
        from_name: fromName,
        tier: newTier,
        total_amount: newTotalAmount,
        is_active: isSubscription ? true : existing.is_active,
        subscription_start:
          isFirstSubscription && isSubscription
            ? new Date().toISOString()
            : existing.subscription_start,
        last_payment_at: new Date().toISOString(),
        transaction_count: newTransactionCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return updated as SupporterRecord;
  }

  // Create new supporter record
  const { data: created, error } = await supabase
    .from('supporters')
    .insert({
      user_id: userId,
      kofi_email: email,
      from_name: fromName,
      tier,
      total_amount: amount,
      currency,
      is_active: isSubscription,
      subscription_start: isSubscription ? new Date().toISOString() : null,
      last_payment_at: new Date().toISOString(),
      transaction_count: 1,
    })
    .select()
    .single();

  if (error) throw error;
  return created as SupporterRecord;
}

/**
 * Get the highest tier between two tiers
 */
function getHighestTier(currentTier: SupporterTier, newTier: SupporterTier): SupporterTier {
  const tierOrder: SupporterTier[] = ['one_time', 'coffee', 'supporter', 'patron', 'champion'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const newIndex = tierOrder.indexOf(newTier);
  return newIndex > currentIndex ? newTier : currentTier;
}

/**
 * Award supporter badges
 */
async function awardSupporterBadges(
  userId: string,
  tier: SupporterTier,
  amount: number
): Promise<void> {
  // Award tier-specific badge
  await awardBadge({
    userId,
    badgeSlug: `supporter-${tier}`,
  });

  // Award milestone badges
  if (amount >= 100) {
    await awardBadge({
      userId,
      badgeSlug: 'supporter-100',
    });
  }
}

// ============================================================================
// SUPPORTER QUERIES
// ============================================================================

/**
 * Get supporter status for a user
 */
export async function getSupporterStatus(userId: string): Promise<SupporterRecord | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('supporters')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data as SupporterRecord;
}

/**
 * Check if a user is an active supporter
 */
export async function isActiveSupporter(userId: string): Promise<boolean> {
  const supporter = await getSupporterStatus(userId);
  return supporter?.is_active || false;
}

/**
 * Get supporter tier for a user
 */
export async function getSupporterTier(userId: string): Promise<SupporterTier | null> {
  const supporter = await getSupporterStatus(userId);
  return supporter?.tier as SupporterTier | null;
}

/**
 * Link Ko-fi email to user account
 */
export async function linkKofiEmail(
  userId: string,
  kofiEmail: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createServiceClient();

  // Check if email has a supporter record
  const { data: supporter } = await supabase
    .from('supporters')
    .select('*')
    .eq('kofi_email', kofiEmail.toLowerCase())
    .single();

  if (!supporter) {
    return {
      success: false,
      message: 'No supporter record found for this email',
    };
  }

  if (supporter.user_id && supporter.user_id !== userId) {
    return {
      success: false,
      message: 'This Ko-fi email is already linked to another account',
    };
  }

  // Link the email
  const { error } = await supabase
    .from('supporters')
    .update({ user_id: userId })
    .eq('id', supporter.id);

  if (error) {
    logger.error('[Ko-fi] Failed to link email', error);
    return { success: false, message: 'Failed to link email' };
  }

  // Award any pending badges
  await awardSupporterBadges(userId, supporter.tier as SupporterTier, supporter.total_amount);

  return { success: true, message: 'Ko-fi email linked successfully' };
}

/**
 * Get all supporters for display (supporters wall)
 */
export async function getSupportersWall(options: {
  limit?: number;
  offset?: number;
  publicOnly?: boolean;
}): Promise<
  {
    id: string;
    name: string;
    tier: SupporterTier;
    message: string | null;
    amount: number;
    date: string;
  }[]
> {
  const { limit = 50, offset = 0, publicOnly = true } = options;
  const supabase = await createServiceClient();

  let query = supabase
    .from('kofi_transactions')
    .select('id, from_name, tier_name, message, amount, processed_at, is_public')
    .order('processed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (publicOnly) {
    query = query.eq('is_public', true);
  }

  const { data } = await query;

  return (data || []).map((tx) => ({
    id: tx.id,
    name: tx.from_name,
    tier: (tx.tier_name?.toLowerCase() || 'one_time') as SupporterTier,
    message: tx.is_public ? tx.message : null,
    amount: tx.amount,
    date: tx.processed_at,
  }));
}

const kofiIntegration = {
  verifyKofiWebhook,
  processKofiWebhook,
  getSupporterStatus,
  isActiveSupporter,
  getSupporterTier,
  linkKofiEmail,
  getSupportersWall,
  SUPPORTER_TIERS,
};
export default kofiIntegration;
