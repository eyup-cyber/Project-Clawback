import { ApiError } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import type { ContentType } from '@/types/database';

// ============================================================================
// TYPES
// ============================================================================

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface ContributorApplication {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  content_types: ContentType[];
  topics: string[];
  why_scroungers: string;
  first_piece_pitch: string;
  portfolio_url: string | null;
  location: string | null;
  status: ApplicationStatus;
  reviewer_id: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationWithReviewer extends ContributorApplication {
  reviewer?: {
    id: string;
    username: string | null;
    display_name: string | null;
  } | null;
}

export interface CreateApplicationInput {
  user_id?: string | null;
  full_name: string;
  email: string;
  content_types: ContentType[];
  topics?: string[];
  why_scroungers: string;
  first_piece_pitch: string;
  portfolio_url?: string | null;
  location?: string | null;
}

// ============================================================================
// APPLICATION OPERATIONS
// ============================================================================

/**
 * Create a new contributor application
 */
export async function createApplication(
  input: CreateApplicationInput
): Promise<ContributorApplication> {
  const supabase = await createClient();

  // Check if user already has a pending application
  if (input.user_id) {
    const { data: existing } = await supabase
      .from('contributor_applications')
      .select('id, status')
      .eq('user_id', input.user_id)
      .eq('status', 'pending')
      .single();

    if (existing) {
      throw ApiError.conflict('You already have a pending application');
    }
  }

  // Check if email already has a pending application
  const { data: emailExists } = await supabase
    .from('contributor_applications')
    .select('id, status')
    .eq('email', input.email.toLowerCase())
    .eq('status', 'pending')
    .single();

  if (emailExists) {
    throw ApiError.conflict('An application with this email is already pending');
  }

  const { data, error } = await supabase
    .from('contributor_applications')
    .insert({
      user_id: input.user_id || null,
      full_name: input.full_name,
      email: input.email.toLowerCase(),
      content_types: input.content_types as string[],
      topics: input.topics || [],
      why_scroungers: input.why_scroungers,
      first_piece_pitch: input.first_piece_pitch,
      portfolio_url: input.portfolio_url || null,
      location: input.location || null,
      status: 'pending' as const,
    })
    .select()
    .single();

  if (error) {
    logger.error('[createApplication] Error', error, {
      userId: input.user_id,
      email: input.email,
    });
    throw ApiError.badRequest('Failed to submit application');
  }

  return data as ContributorApplication;
}

/**
 * Get an application by ID
 */
export async function getApplicationById(id: string): Promise<ApplicationWithReviewer> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('contributor_applications')
    .select(
      `
      *,
      reviewer:profiles!contributor_applications_reviewer_id_fkey (
        id,
        username,
        display_name
      )
    `
    )
    .eq('id', id)
    .single();

  if (error || !data) {
    throw ApiError.notFound('Application');
  }

  return data as ApplicationWithReviewer;
}

/**
 * List applications with filtering and pagination
 */
export async function listApplications(options: {
  status?: ApplicationStatus;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ applications: ApplicationWithReviewer[]; total: number }> {
  const supabase = await createClient();
  const { status, page = 1, limit = 20, search } = options;

  let query = supabase.from('contributor_applications').select(
    `
      *,
      reviewer:profiles!contributor_applications_reviewer_id_fkey (
        id,
        username,
        display_name
      )
    `,
    { count: 'exact' }
  );

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    logger.error('[listApplications] Error', error, {
      status,
      search,
      page,
      limit,
    });
    throw ApiError.badRequest('Failed to fetch applications');
  }

  return {
    applications: (data || []) as ApplicationWithReviewer[],
    total: count || 0,
  };
}

/**
 * Get pending applications
 */
export async function getPendingApplications(options: {
  page?: number;
  limit?: number;
}): Promise<{ applications: ApplicationWithReviewer[]; total: number }> {
  return listApplications({ ...options, status: 'pending' });
}

/**
 * Approve an application
 */
export async function approveApplication(
  id: string,
  reviewerId: string,
  notes?: string
): Promise<ApplicationWithReviewer> {
  const supabase = await createClient();

  // Get the application
  const application = await getApplicationById(id);

  if (application.status !== 'pending') {
    throw ApiError.badRequest('Application has already been reviewed');
  }

  // Update application status
  const { error: updateError } = await supabase
    .from('contributor_applications')
    .update({
      status: 'approved',
      reviewer_id: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || null,
    })
    .eq('id', id);

  if (updateError) {
    logger.error('[approveApplication] Update error', updateError, {
      applicationId: id,
    });
    throw ApiError.badRequest('Failed to approve application');
  }

  // If the application has a user_id, upgrade their role to contributor
  if (application.user_id) {
    const { error: roleError } = await supabase
      .from('profiles')
      .update({ role: 'contributor' })
      .eq('id', application.user_id);

    if (roleError) {
      logger.error('[approveApplication] Role update error', roleError, {
        userId: application.user_id,
      });
      // Don't throw - application is approved, role update can be done manually
    }
  }

  return getApplicationById(id);
}

/**
 * Reject an application
 */
export async function rejectApplication(
  id: string,
  reviewerId: string,
  notes?: string
): Promise<ApplicationWithReviewer> {
  const supabase = await createClient();

  // Get the application
  const application = await getApplicationById(id);

  if (application.status !== 'pending') {
    throw ApiError.badRequest('Application has already been reviewed');
  }

  const { error } = await supabase
    .from('contributor_applications')
    .update({
      status: 'rejected',
      reviewer_id: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || null,
    })
    .eq('id', id);

  if (error) {
    logger.error('[rejectApplication] Error', error, { applicationId: id });
    throw ApiError.badRequest('Failed to reject application');
  }

  return getApplicationById(id);
}

/**
 * Get user's application status
 */
export async function getUserApplicationStatus(
  userId: string
): Promise<ContributorApplication | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('contributor_applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data as ContributorApplication | null;
}

/**
 * Check if user can apply (not already a contributor and no pending application)
 */
export async function canUserApply(userId: string): Promise<{
  canApply: boolean;
  reason?: string;
}> {
  const supabase = await createClient();

  // Check if already a contributor
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profile?.role && ['contributor', 'editor', 'admin'].includes(profile.role)) {
    return { canApply: false, reason: 'You are already a contributor' };
  }

  // Check for pending application
  const { data: pending } = await supabase
    .from('contributor_applications')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .single();

  if (pending) {
    return {
      canApply: false,
      reason: 'You already have a pending application',
    };
  }

  return { canApply: true };
}

/**
 * Get application statistics
 */
export async function getApplicationStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}> {
  const supabase = await createClient();

  const { data: applications } = await supabase.from('contributor_applications').select('status');

  const stats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  (applications || []).forEach((app) => {
    stats.total++;
    if (app.status === 'pending') stats.pending++;
    else if (app.status === 'approved') stats.approved++;
    else if (app.status === 'rejected') stats.rejected++;
  });

  return stats;
}
