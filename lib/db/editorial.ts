/**
 * Editorial Workflow Database Functions
 * Phase 5: Review assignment, inline annotations, revision tracking
 */

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ReviewAssignment {
  id: string;
  post_id: string;
  reviewer_id: string;
  assigned_by: string;
  status: 'pending' | 'in_progress' | 'completed' | 'declined';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  due_date: string | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InlineAnnotation {
  id: string;
  post_id: string;
  author_id: string;
  target_type: 'text' | 'image' | 'embed';
  target_selector: string; // CSS selector or text position
  content: string;
  annotation_type: 'comment' | 'suggestion' | 'correction' | 'question';
  status: 'open' | 'resolved' | 'rejected';
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnotationReply {
  id: string;
  annotation_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface RevisionRequest {
  id: string;
  post_id: string;
  reviewer_id: string;
  summary: string;
  details: string | null;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  items: RevisionItem[];
  created_at: string;
  completed_at: string | null;
}

export interface RevisionItem {
  id: string;
  description: string;
  completed: boolean;
  completed_at: string | null;
}

export interface ReviewWithDetails extends ReviewAssignment {
  post: {
    id: string;
    title: string;
    author: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    };
  };
  reviewer: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

// ============================================================================
// REVIEW ASSIGNMENT FUNCTIONS
// ============================================================================

/**
 * Get review assignments for a reviewer
 */
export async function getReviewAssignments(
  reviewerId: string,
  options: { status?: string; limit?: number; offset?: number } = {}
): Promise<ReviewWithDetails[]> {
  const { status, limit = 20, offset = 0 } = options;
  const supabase = await createClient();

  let query = supabase
    .from('review_assignments')
    .select(
      `
      *,
      post:posts(
        id,
        title,
        author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url)
      ),
      reviewer:profiles!review_assignments_reviewer_id_fkey(id, username, display_name, avatar_url)
    `
    )
    .eq('reviewer_id', reviewerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('[Editorial] Error fetching review assignments', error);
    throw error;
  }

  return (data || []) as unknown as ReviewWithDetails[];
}

/**
 * Get pending reviews for a post
 */
export async function getPostReviews(postId: string): Promise<ReviewAssignment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('review_assignments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('[Editorial] Error fetching post reviews', error);
    throw error;
  }

  return data || [];
}

/**
 * Assign a post for review
 */
export async function assignReview(options: {
  postId: string;
  reviewerId: string;
  assignedBy: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  dueDate?: string;
  notes?: string;
}): Promise<ReviewAssignment> {
  const { postId, reviewerId, assignedBy, priority = 'normal', dueDate, notes } = options;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('review_assignments')
    .insert({
      post_id: postId,
      reviewer_id: reviewerId,
      assigned_by: assignedBy,
      status: 'pending',
      priority,
      due_date: dueDate || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    logger.error('[Editorial] Error assigning review', error);
    throw error;
  }

  return data;
}

/**
 * Update review assignment status
 */
export async function updateReviewStatus(
  assignmentId: string,
  status: ReviewAssignment['status'],
  reviewerId: string
): Promise<ReviewAssignment> {
  const supabase = await createClient();

  const updateData: Partial<ReviewAssignment> = { status };

  if (status === 'in_progress' && !updateData.started_at) {
    updateData.started_at = new Date().toISOString();
  }

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('review_assignments')
    .update(updateData)
    .eq('id', assignmentId)
    .eq('reviewer_id', reviewerId)
    .select()
    .single();

  if (error) {
    logger.error('[Editorial] Error updating review status', error);
    throw error;
  }

  return data;
}

// ============================================================================
// INLINE ANNOTATION FUNCTIONS
// ============================================================================

/**
 * Get annotations for a post
 */
export async function getPostAnnotations(
  postId: string,
  options: { status?: string } = {}
): Promise<
  (InlineAnnotation & {
    author: { username: string; display_name: string; avatar_url: string | null };
  })[]
> {
  const { status } = options;
  const supabase = await createClient();

  let query = supabase
    .from('inline_annotations')
    .select(
      `
      *,
      author:profiles!inline_annotations_author_id_fkey(username, display_name, avatar_url)
    `
    )
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('[Editorial] Error fetching annotations', error);
    throw error;
  }

  return data as unknown as (InlineAnnotation & {
    author: { username: string; display_name: string; avatar_url: string | null };
  })[];
}

/**
 * Create an inline annotation
 */
export async function createAnnotation(options: {
  postId: string;
  authorId: string;
  targetType: InlineAnnotation['target_type'];
  targetSelector: string;
  content: string;
  annotationType: InlineAnnotation['annotation_type'];
}): Promise<InlineAnnotation> {
  const { postId, authorId, targetType, targetSelector, content, annotationType } = options;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('inline_annotations')
    .insert({
      post_id: postId,
      author_id: authorId,
      target_type: targetType,
      target_selector: targetSelector,
      content,
      annotation_type: annotationType,
      status: 'open',
    })
    .select()
    .single();

  if (error) {
    logger.error('[Editorial] Error creating annotation', error);
    throw error;
  }

  return data;
}

/**
 * Resolve an annotation
 */
export async function resolveAnnotation(
  annotationId: string,
  resolvedBy: string,
  status: 'resolved' | 'rejected' = 'resolved'
): Promise<InlineAnnotation> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('inline_annotations')
    .update({
      status,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', annotationId)
    .select()
    .single();

  if (error) {
    logger.error('[Editorial] Error resolving annotation', error);
    throw error;
  }

  return data;
}

/**
 * Add a reply to an annotation
 */
export async function addAnnotationReply(options: {
  annotationId: string;
  authorId: string;
  content: string;
}): Promise<AnnotationReply> {
  const { annotationId, authorId, content } = options;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('annotation_replies')
    .insert({
      annotation_id: annotationId,
      author_id: authorId,
      content,
    })
    .select()
    .single();

  if (error) {
    logger.error('[Editorial] Error adding annotation reply', error);
    throw error;
  }

  return data;
}

/**
 * Get replies for an annotation
 */
export async function getAnnotationReplies(annotationId: string): Promise<
  (AnnotationReply & {
    author: { username: string; display_name: string; avatar_url: string | null };
  })[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('annotation_replies')
    .select(
      `
      *,
      author:profiles!annotation_replies_author_id_fkey(username, display_name, avatar_url)
    `
    )
    .eq('annotation_id', annotationId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('[Editorial] Error fetching annotation replies', error);
    throw error;
  }

  return data as unknown as (AnnotationReply & {
    author: { username: string; display_name: string; avatar_url: string | null };
  })[];
}

// ============================================================================
// REVISION REQUEST FUNCTIONS
// ============================================================================

/**
 * Create a revision request
 */
export async function createRevisionRequest(options: {
  postId: string;
  reviewerId: string;
  summary: string;
  details?: string;
  priority?: 'low' | 'normal' | 'high';
  items: { description: string }[];
}): Promise<RevisionRequest> {
  const { postId, reviewerId, summary, details, priority = 'normal', items } = options;
  const supabase = await createClient();

  // Create revision request
  const { data: revision, error } = await supabase
    .from('revision_requests')
    .insert({
      post_id: postId,
      reviewer_id: reviewerId,
      summary,
      details: details || null,
      priority,
      status: 'pending',
      items: items.map((item) => ({
        id: crypto.randomUUID(),
        description: item.description,
        completed: false,
        completed_at: null,
      })),
    })
    .select()
    .single();

  if (error) {
    logger.error('[Editorial] Error creating revision request', error);
    throw error;
  }

  return revision;
}

/**
 * Get revision requests for a post
 */
export async function getPostRevisionRequests(postId: string): Promise<
  (RevisionRequest & {
    reviewer: { username: string; display_name: string; avatar_url: string | null };
  })[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('revision_requests')
    .select(
      `
      *,
      reviewer:profiles!revision_requests_reviewer_id_fkey(username, display_name, avatar_url)
    `
    )
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('[Editorial] Error fetching revision requests', error);
    throw error;
  }

  return data as unknown as (RevisionRequest & {
    reviewer: { username: string; display_name: string; avatar_url: string | null };
  })[];
}

/**
 * Update revision item status
 */
export async function updateRevisionItem(
  revisionId: string,
  itemId: string,
  completed: boolean
): Promise<RevisionRequest> {
  const supabase = await createClient();

  // Get current revision
  const { data: revision, error: fetchError } = await supabase
    .from('revision_requests')
    .select('*')
    .eq('id', revisionId)
    .single();

  if (fetchError || !revision) {
    throw new Error('Revision request not found');
  }

  // Update item
  const items = (revision.items as RevisionItem[]).map((item) =>
    item.id === itemId
      ? {
          ...item,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        }
      : item
  );

  // Check if all items are completed
  const allCompleted = items.every((item) => item.completed);

  const { data, error } = await supabase
    .from('revision_requests')
    .update({
      items,
      status: allCompleted ? 'completed' : 'in_progress',
      completed_at: allCompleted ? new Date().toISOString() : null,
    })
    .eq('id', revisionId)
    .select()
    .single();

  if (error) {
    logger.error('[Editorial] Error updating revision item', error);
    throw error;
  }

  return data;
}

// ============================================================================
// AUTO-ASSIGNMENT
// ============================================================================

/**
 * Get available reviewers based on workload and expertise
 */
export async function getAvailableReviewers(options: {
  categoryId?: string;
  excludeUserIds?: string[];
  limit?: number;
}): Promise<
  {
    id: string;
    username: string;
    display_name: string;
    pending_reviews: number;
  }[]
> {
  const { excludeUserIds = [], limit = 5 } = options;
  const supabase = await createClient();

  // Get editors with their pending review count
  const { data, error } = await supabase.rpc('get_available_reviewers', {
    p_exclude_user_ids: excludeUserIds,
    p_limit: limit,
  });

  if (error) {
    // Fallback to simple query if RPC doesn't exist
    const { data: editors, error: fallbackError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('role', ['editor', 'admin'])
      .limit(limit);

    if (fallbackError) {
      logger.error('[Editorial] Error fetching reviewers', fallbackError);
      throw fallbackError;
    }

    return (editors || []).map((e) => ({
      ...e,
      pending_reviews: 0,
    }));
  }

  return data || [];
}

/**
 * Auto-assign a post to a reviewer
 */
export async function autoAssignReview(
  postId: string,
  assignedBy: string,
  options: { categoryId?: string; priority?: 'low' | 'normal' | 'high' | 'urgent' } = {}
): Promise<ReviewAssignment | null> {
  const { categoryId, priority = 'normal' } = options;

  // Get the post author to exclude them
  const supabase = await createClient();
  const { data: post } = await supabase.from('posts').select('author_id').eq('id', postId).single();

  if (!post) {
    throw new Error('Post not found');
  }

  // Get available reviewers
  const reviewers = await getAvailableReviewers({
    categoryId,
    excludeUserIds: [post.author_id],
  });

  if (reviewers.length === 0) {
    logger.warn('[Editorial] No available reviewers for auto-assignment', { postId });
    return null;
  }

  // Assign to reviewer with fewest pending reviews
  const reviewer = reviewers[0];

  return assignReview({
    postId,
    reviewerId: reviewer.id,
    assignedBy,
    priority,
  });
}

const editorial = {
  // Review assignments
  getReviewAssignments,
  getPostReviews,
  assignReview,
  updateReviewStatus,
  autoAssignReview,
  getAvailableReviewers,

  // Annotations
  getPostAnnotations,
  createAnnotation,
  resolveAnnotation,
  addAnnotationReply,
  getAnnotationReplies,

  // Revision requests
  createRevisionRequest,
  getPostRevisionRequests,
  updateRevisionItem,
};

export default editorial;
