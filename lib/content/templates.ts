/**
 * Content Templates System
 * Phase 31: Template creation, management, and application
 */

import { logger } from '@/lib/logger';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface ContentTemplate {
  id: string;
  name: string;
  description: string | null;
  type: TemplateType;
  category_id: string | null;
  content: TemplateContent;
  thumbnail_url: string | null;
  is_public: boolean;
  is_default: boolean;
  usage_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type TemplateType =
  | 'article'
  | 'review'
  | 'tutorial'
  | 'news'
  | 'opinion'
  | 'interview'
  | 'listicle'
  | 'custom';

export interface TemplateContent {
  title_placeholder: string;
  excerpt_placeholder: string;
  body: string; // TipTap JSON or HTML
  suggested_word_count: number;
  sections: TemplateSection[];
  metadata: {
    tags: string[];
    reading_time_estimate: number;
    difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  };
}

export interface TemplateSection {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  required: boolean;
  order: number;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  template_count: number;
}

// ============================================================================
// BUILT-IN TEMPLATES
// ============================================================================

export const BUILTIN_TEMPLATES: Omit<
  ContentTemplate,
  'id' | 'created_by' | 'created_at' | 'updated_at' | 'usage_count'
>[] = [
  {
    name: 'Standard Article',
    description: 'A classic article structure with introduction, body, and conclusion',
    type: 'article',
    category_id: null,
    thumbnail_url: null,
    is_public: true,
    is_default: true,
    content: {
      title_placeholder: 'Enter your article title...',
      excerpt_placeholder: 'Write a compelling summary of your article...',
      body: "<h2>Introduction</h2><p>Start with a hook that grabs the reader's attention...</p><h2>Main Content</h2><p>Develop your key points here...</p><h2>Conclusion</h2><p>Summarize and provide a call to action...</p>",
      suggested_word_count: 1500,
      sections: [
        {
          id: 'intro',
          name: 'Introduction',
          description: 'Hook and context',
          placeholder: 'Start with a hook...',
          required: true,
          order: 1,
        },
        {
          id: 'body',
          name: 'Main Content',
          description: 'Core arguments',
          placeholder: 'Develop your points...',
          required: true,
          order: 2,
        },
        {
          id: 'conclusion',
          name: 'Conclusion',
          description: 'Summary and CTA',
          placeholder: 'Wrap up your article...',
          required: true,
          order: 3,
        },
      ],
      metadata: {
        tags: [],
        reading_time_estimate: 7,
        difficulty_level: 'beginner',
      },
    },
  },
  {
    name: 'Product Review',
    description: 'Structured template for reviewing products, games, or media',
    type: 'review',
    category_id: null,
    thumbnail_url: null,
    is_public: true,
    is_default: false,
    content: {
      title_placeholder: 'Review: [Product Name]',
      excerpt_placeholder: 'Quick verdict and rating summary...',
      body: '<h2>Overview</h2><p>What is this product and who is it for?</p><h2>Features</h2><p>Key features and specifications...</p><h2>Pros</h2><ul><li>Pro 1</li><li>Pro 2</li></ul><h2>Cons</h2><ul><li>Con 1</li><li>Con 2</li></ul><h2>Verdict</h2><p>Final thoughts and rating...</p>',
      suggested_word_count: 1200,
      sections: [
        {
          id: 'overview',
          name: 'Overview',
          description: 'Product introduction',
          placeholder: 'Introduce the product...',
          required: true,
          order: 1,
        },
        {
          id: 'features',
          name: 'Features',
          description: 'Key features',
          placeholder: 'List key features...',
          required: true,
          order: 2,
        },
        {
          id: 'pros',
          name: 'Pros',
          description: 'Advantages',
          placeholder: 'List advantages...',
          required: true,
          order: 3,
        },
        {
          id: 'cons',
          name: 'Cons',
          description: 'Disadvantages',
          placeholder: 'List disadvantages...',
          required: true,
          order: 4,
        },
        {
          id: 'verdict',
          name: 'Verdict',
          description: 'Final rating',
          placeholder: 'Give your verdict...',
          required: true,
          order: 5,
        },
      ],
      metadata: {
        tags: ['review'],
        reading_time_estimate: 5,
        difficulty_level: 'beginner',
      },
    },
  },
  {
    name: 'How-To Tutorial',
    description: 'Step-by-step guide with prerequisites and troubleshooting',
    type: 'tutorial',
    category_id: null,
    thumbnail_url: null,
    is_public: true,
    is_default: false,
    content: {
      title_placeholder: 'How to [Action] in [Context]',
      excerpt_placeholder: 'Learn how to achieve [goal] with this step-by-step guide...',
      body: "<h2>What You'll Learn</h2><p>By the end of this tutorial, you will be able to...</p><h2>Prerequisites</h2><ul><li>Requirement 1</li><li>Requirement 2</li></ul><h2>Step 1: [First Step]</h2><p>Instructions for step 1...</p><h2>Step 2: [Second Step]</h2><p>Instructions for step 2...</p><h2>Troubleshooting</h2><p>Common issues and solutions...</p><h2>Next Steps</h2><p>Where to go from here...</p>",
      suggested_word_count: 2000,
      sections: [
        {
          id: 'objectives',
          name: "What You'll Learn",
          description: 'Learning objectives',
          placeholder: 'List what readers will learn...',
          required: true,
          order: 1,
        },
        {
          id: 'prerequisites',
          name: 'Prerequisites',
          description: 'Requirements',
          placeholder: 'List prerequisites...',
          required: false,
          order: 2,
        },
        {
          id: 'steps',
          name: 'Steps',
          description: 'Tutorial steps',
          placeholder: 'Add step-by-step instructions...',
          required: true,
          order: 3,
        },
        {
          id: 'troubleshooting',
          name: 'Troubleshooting',
          description: 'Common issues',
          placeholder: 'Add troubleshooting tips...',
          required: false,
          order: 4,
        },
        {
          id: 'next-steps',
          name: 'Next Steps',
          description: 'Further learning',
          placeholder: 'Suggest next steps...',
          required: false,
          order: 5,
        },
      ],
      metadata: {
        tags: ['tutorial', 'how-to'],
        reading_time_estimate: 10,
        difficulty_level: 'intermediate',
      },
    },
  },
  {
    name: 'News Article',
    description: 'Inverted pyramid structure for breaking news',
    type: 'news',
    category_id: null,
    thumbnail_url: null,
    is_public: true,
    is_default: false,
    content: {
      title_placeholder: '[Subject] [Action] [Context]',
      excerpt_placeholder: 'The most important facts in one sentence...',
      body: "<h2>The Story</h2><p>Who, what, when, where, why, and how...</p><h2>Background</h2><p>Context and history...</p><h2>Reactions</h2><p>Quotes and responses from relevant parties...</p><h2>What's Next</h2><p>Future implications and developments to watch...</p>",
      suggested_word_count: 800,
      sections: [
        {
          id: 'lead',
          name: 'The Story',
          description: 'Key facts',
          placeholder: 'Cover the 5 Ws...',
          required: true,
          order: 1,
        },
        {
          id: 'background',
          name: 'Background',
          description: 'Context',
          placeholder: 'Provide background...',
          required: true,
          order: 2,
        },
        {
          id: 'reactions',
          name: 'Reactions',
          description: 'Quotes',
          placeholder: 'Include reactions...',
          required: false,
          order: 3,
        },
        {
          id: 'next',
          name: "What's Next",
          description: 'Future outlook',
          placeholder: 'Discuss implications...',
          required: false,
          order: 4,
        },
      ],
      metadata: {
        tags: ['news'],
        reading_time_estimate: 4,
        difficulty_level: 'beginner',
      },
    },
  },
  {
    name: 'Listicle',
    description: 'Numbered list format for engaging content',
    type: 'listicle',
    category_id: null,
    thumbnail_url: null,
    is_public: true,
    is_default: false,
    content: {
      title_placeholder: '[Number] [Adjective] [Things] You [Need/Should/Must] [Action]',
      excerpt_placeholder: 'Discover the top [number] [things] that will [benefit]...',
      body: '<h2>Introduction</h2><p>Why this list matters...</p><h2>1. [First Item]</h2><p>Description and details...</p><h2>2. [Second Item]</h2><p>Description and details...</p><h2>3. [Third Item]</h2><p>Description and details...</p><h2>Conclusion</h2><p>Wrap up and key takeaways...</p>',
      suggested_word_count: 1000,
      sections: [
        {
          id: 'intro',
          name: 'Introduction',
          description: 'Set up the list',
          placeholder: 'Introduce your list...',
          required: true,
          order: 1,
        },
        {
          id: 'items',
          name: 'List Items',
          description: 'The numbered items',
          placeholder: 'Add your list items...',
          required: true,
          order: 2,
        },
        {
          id: 'conclusion',
          name: 'Conclusion',
          description: 'Wrap up',
          placeholder: 'Conclude your list...',
          required: false,
          order: 3,
        },
      ],
      metadata: {
        tags: ['listicle', 'list'],
        reading_time_estimate: 5,
        difficulty_level: 'beginner',
      },
    },
  },
  {
    name: 'Interview',
    description: 'Q&A format for interviews and conversations',
    type: 'interview',
    category_id: null,
    thumbnail_url: null,
    is_public: true,
    is_default: false,
    content: {
      title_placeholder: 'Interview with [Name]: [Topic/Theme]',
      excerpt_placeholder: '[Name] discusses [topic] in this exclusive interview...',
      body: '<h2>About [Interviewee]</h2><p>Brief bio and context...</p><h2>The Interview</h2><p><strong>Q: First question?</strong></p><p>A: Answer...</p><p><strong>Q: Second question?</strong></p><p>A: Answer...</p><h2>Key Takeaways</h2><p>Summary of main points...</p>',
      suggested_word_count: 1500,
      sections: [
        {
          id: 'bio',
          name: 'About the Interviewee',
          description: 'Introduction',
          placeholder: 'Introduce the interviewee...',
          required: true,
          order: 1,
        },
        {
          id: 'qa',
          name: 'Q&A',
          description: 'Questions and answers',
          placeholder: 'Add Q&A pairs...',
          required: true,
          order: 2,
        },
        {
          id: 'takeaways',
          name: 'Key Takeaways',
          description: 'Summary',
          placeholder: 'Summarize key points...',
          required: false,
          order: 3,
        },
      ],
      metadata: {
        tags: ['interview'],
        reading_time_estimate: 7,
        difficulty_level: 'intermediate',
      },
    },
  },
];

// ============================================================================
// TEMPLATE CRUD
// ============================================================================

/**
 * Get all templates
 */
export async function getTemplates(options: {
  type?: TemplateType;
  categoryId?: string;
  isPublic?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ templates: ContentTemplate[]; total: number }> {
  const { type, categoryId, isPublic, search, limit = 20, offset = 0 } = options;
  const supabase = await createClient();

  let query = supabase
    .from('content_templates')
    .select('*', { count: 'exact' })
    .order('usage_count', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq('type', type);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (isPublic !== undefined) query = query.eq('is_public', isPublic);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data, count, error } = await query;

  if (error) {
    logger.error('[Templates] Failed to fetch templates', error);
    throw error;
  }

  return {
    templates: (data || []) as ContentTemplate[],
    total: count || 0,
  };
}

/**
 * Get a single template
 */
export async function getTemplate(templateId: string): Promise<ContentTemplate | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('content_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) return null;
  return data as ContentTemplate;
}

/**
 * Create a template
 */
export async function createTemplate(
  userId: string,
  template: Omit<ContentTemplate, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'usage_count'>
): Promise<ContentTemplate> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('content_templates')
    .insert({
      ...template,
      created_by: userId,
      usage_count: 0,
    })
    .select()
    .single();

  if (error) {
    logger.error('[Templates] Failed to create template', error);
    throw error;
  }

  logger.info('[Templates] Template created', {
    templateId: data.id,
    name: template.name,
  });

  return data as ContentTemplate;
}

/**
 * Update a template
 */
export async function updateTemplate(
  templateId: string,
  userId: string,
  updates: Partial<Omit<ContentTemplate, 'id' | 'created_by' | 'created_at' | 'updated_at'>>
): Promise<ContentTemplate> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('content_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .eq('created_by', userId)
    .select()
    .single();

  if (error) {
    logger.error('[Templates] Failed to update template', error);
    throw error;
  }

  return data as ContentTemplate;
}

/**
 * Delete a template
 */
export async function deleteTemplate(templateId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('content_templates')
    .delete()
    .eq('id', templateId)
    .eq('created_by', userId);

  if (error) {
    logger.error('[Templates] Failed to delete template', error);
    throw error;
  }

  logger.info('[Templates] Template deleted', { templateId });
}

/**
 * Duplicate a template
 */
export async function duplicateTemplate(
  templateId: string,
  userId: string,
  newName?: string
): Promise<ContentTemplate> {
  const original = await getTemplate(templateId);
  if (!original) throw new Error('Template not found');

  return createTemplate(userId, {
    name: newName || `${original.name} (Copy)`,
    description: original.description,
    type: original.type,
    category_id: original.category_id,
    content: original.content,
    thumbnail_url: original.thumbnail_url,
    is_public: false, // Copies are private by default
    is_default: false,
  });
}

/**
 * Increment template usage count
 */
export async function incrementTemplateUsage(templateId: string): Promise<void> {
  const supabase = await createServiceClient();

  await supabase.rpc('increment_template_usage', { template_id: templateId });
}

// ============================================================================
// TEMPLATE APPLICATION
// ============================================================================

/**
 * Apply a template to create post content
 */
export async function applyTemplate(templateId: string): Promise<{
  title: string;
  excerpt: string;
  content: string;
  metadata: ContentTemplate['content']['metadata'];
}> {
  const template = await getTemplate(templateId);
  if (!template) throw new Error('Template not found');

  // Increment usage count
  await incrementTemplateUsage(templateId);

  return {
    title: template.content.title_placeholder,
    excerpt: template.content.excerpt_placeholder,
    content: template.content.body,
    metadata: template.content.metadata,
  };
}

/**
 * Get user's templates
 */
export async function getUserTemplates(userId: string): Promise<ContentTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('content_templates')
    .select('*')
    .eq('created_by', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    logger.error('[Templates] Failed to fetch user templates', error);
    throw error;
  }

  return (data || []) as ContentTemplate[];
}

/**
 * Get default templates
 */
export async function getDefaultTemplates(): Promise<ContentTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('content_templates')
    .select('*')
    .eq('is_default', true)
    .order('name', { ascending: true });

  if (error) {
    logger.error('[Templates] Failed to fetch default templates', error);
    throw error;
  }

  return (data || []) as ContentTemplate[];
}

/**
 * Seed built-in templates
 */
export async function seedBuiltinTemplates(systemUserId: string): Promise<void> {
  const supabase = await createServiceClient();

  for (const template of BUILTIN_TEMPLATES) {
    const { error } = await supabase.from('content_templates').upsert(
      {
        ...template,
        created_by: systemUserId,
        usage_count: 0,
      },
      {
        onConflict: 'name,created_by',
        ignoreDuplicates: true,
      }
    );

    if (error) {
      logger.warn('[Templates] Failed to seed template', {
        name: template.name,
        error,
      });
    }
  }

  logger.info('[Templates] Built-in templates seeded');
}

export default {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  applyTemplate,
  getUserTemplates,
  getDefaultTemplates,
  seedBuiltinTemplates,
  incrementTemplateUsage,
  BUILTIN_TEMPLATES,
};
