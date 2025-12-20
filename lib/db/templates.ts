/**
 * Content Templates Library
 * CRUD operations for post templates
 */

import { createServiceClient } from '@/lib/supabase/server';

export interface PostTemplate {
  id: string;
  name: string;
  description?: string;
  contentType: string;
  titleTemplate?: string;
  contentTemplate: string;
  excerptTemplate?: string;
  defaultCategoryId?: string;
  defaultTags?: string[];
  metadata?: Record<string, unknown>;
  structure?: Record<string, unknown>;
  visibility: 'private' | 'team' | 'public';
  createdBy: string;
  useCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  category?: { id: string; name: string; slug: string };
  author?: { username: string; displayName?: string };
  variables?: TemplateVariable[];
}

export interface TemplateVariable {
  id: string;
  templateId: string;
  name: string;
  label: string;
  description?: string;
  variableType: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect';
  options?: string[] | { value: string; label: string }[];
  defaultValue?: string;
  required: boolean;
  validationPattern?: string;
  sortOrder: number;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  contentType?: string;
  titleTemplate?: string;
  contentTemplate: string;
  excerptTemplate?: string;
  defaultCategoryId?: string;
  defaultTags?: string[];
  metadata?: Record<string, unknown>;
  structure?: Record<string, unknown>;
  visibility?: 'private' | 'team' | 'public';
}

export type UpdateTemplateInput = Partial<CreateTemplateInput>;

/**
 * Get all templates accessible to the user
 */
export async function getTemplates(options?: {
  contentType?: string;
  visibility?: string;
  limit?: number;
  offset?: number;
}): Promise<{ templates: PostTemplate[]; total: number }> {
  const supabase = await createServiceClient();
  const { contentType, visibility, limit = 50, offset = 0 } = options || {};

  let query = supabase
    .from('post_templates')
    .select(
      `
      *,
      category:categories(id, name, slug),
      author:profiles!created_by(username, display_name)
    `,
      { count: 'exact' }
    )
    .order('use_count', { ascending: false })
    .range(offset, offset + limit - 1);

  if (contentType) {
    query = query.eq('content_type', contentType);
  }

  if (visibility) {
    query = query.eq('visibility', visibility);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching templates:', error);
    return { templates: [], total: 0 };
  }

  const templates: PostTemplate[] = (data || []).map(transformTemplate);
  return { templates, total: count || 0 };
}

/**
 * Get a specific template
 */
export async function getTemplate(templateId: string): Promise<PostTemplate | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('post_templates')
    .select(
      `
      *,
      category:categories(id, name, slug),
      author:profiles!created_by(username, display_name),
      variables:template_variables(*)
    `
    )
    .eq('id', templateId)
    .single();

  if (error || !data) {
    console.error('Error fetching template:', error);
    return null;
  }

  return transformTemplate(data);
}

/**
 * Create a new template
 */
export async function createTemplate(
  input: CreateTemplateInput,
  userId: string
): Promise<PostTemplate | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('post_templates')
    .insert({
      name: input.name,
      description: input.description,
      content_type: input.contentType || 'written',
      title_template: input.titleTemplate,
      content_template: input.contentTemplate,
      excerpt_template: input.excerptTemplate,
      default_category_id: input.defaultCategoryId,
      default_tags: input.defaultTags,
      metadata: input.metadata || {},
      structure: input.structure || {},
      visibility: input.visibility || 'private',
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating template:', error);
    return null;
  }

  return transformTemplate(data);
}

/**
 * Update a template
 */
export async function updateTemplate(
  templateId: string,
  input: UpdateTemplateInput
): Promise<PostTemplate | null> {
  const supabase = await createServiceClient();

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.contentType !== undefined) updateData.content_type = input.contentType;
  if (input.titleTemplate !== undefined) updateData.title_template = input.titleTemplate;
  if (input.contentTemplate !== undefined) updateData.content_template = input.contentTemplate;
  if (input.excerptTemplate !== undefined) updateData.excerpt_template = input.excerptTemplate;
  if (input.defaultCategoryId !== undefined)
    updateData.default_category_id = input.defaultCategoryId;
  if (input.defaultTags !== undefined) updateData.default_tags = input.defaultTags;
  if (input.metadata !== undefined) updateData.metadata = input.metadata;
  if (input.structure !== undefined) updateData.structure = input.structure;
  if (input.visibility !== undefined) updateData.visibility = input.visibility;

  const { data, error } = await supabase
    .from('post_templates')
    .update(updateData)
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    console.error('Error updating template:', error);
    return null;
  }

  return transformTemplate(data);
}

/**
 * Delete a template
 */
export async function deleteTemplate(templateId: string): Promise<boolean> {
  const supabase = await createServiceClient();

  const { error } = await supabase.from('post_templates').delete().eq('id', templateId);

  return !error;
}

/**
 * Create a post from a template
 */
export async function createPostFromTemplate(
  templateId: string,
  title?: string,
  variables?: Record<string, string>
): Promise<string | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase.rpc('create_post_from_template', {
    p_template_id: templateId,
    p_title: title || null,
    p_variables: variables || {},
  });

  if (error) {
    console.error('Error creating post from template:', error);
    return null;
  }

  return data as string;
}

/**
 * Duplicate a template
 */
export async function duplicateTemplate(
  templateId: string,
  userId: string,
  newName?: string
): Promise<PostTemplate | null> {
  const original = await getTemplate(templateId);
  if (!original) return null;

  return createTemplate(
    {
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      contentType: original.contentType,
      titleTemplate: original.titleTemplate,
      contentTemplate: original.contentTemplate,
      excerptTemplate: original.excerptTemplate,
      defaultCategoryId: original.defaultCategoryId,
      defaultTags: original.defaultTags,
      metadata: original.metadata,
      structure: original.structure,
      visibility: 'private', // Copies are always private initially
    },
    userId
  );
}

/**
 * Get template variables
 */
export async function getTemplateVariables(templateId: string): Promise<TemplateVariable[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('template_variables')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order');

  if (error) {
    console.error('Error fetching template variables:', error);
    return [];
  }

  return (data || []).map((v) => ({
    id: v.id,
    templateId: v.template_id,
    name: v.name,
    label: v.label,
    description: v.description,
    variableType: v.variable_type,
    options: v.options,
    defaultValue: v.default_value,
    required: v.required,
    validationPattern: v.validation_pattern,
    sortOrder: v.sort_order,
  }));
}

/**
 * Add a variable to a template
 */
export async function addTemplateVariable(
  templateId: string,
  variable: Omit<TemplateVariable, 'id' | 'templateId'>
): Promise<TemplateVariable | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('template_variables')
    .insert({
      template_id: templateId,
      name: variable.name,
      label: variable.label,
      description: variable.description,
      variable_type: variable.variableType,
      options: variable.options,
      default_value: variable.defaultValue,
      required: variable.required,
      validation_pattern: variable.validationPattern,
      sort_order: variable.sortOrder,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding template variable:', error);
    return null;
  }

  return {
    id: data.id,
    templateId: data.template_id,
    name: data.name,
    label: data.label,
    description: data.description,
    variableType: data.variable_type,
    options: data.options,
    defaultValue: data.default_value,
    required: data.required,
    validationPattern: data.validation_pattern,
    sortOrder: data.sort_order,
  };
}

/**
 * Delete a template variable
 */
export async function deleteTemplateVariable(variableId: string): Promise<boolean> {
  const supabase = await createServiceClient();

  const { error } = await supabase.from('template_variables').delete().eq('id', variableId);

  return !error;
}

// Helper function to transform database row to TypeScript interface
function transformTemplate(data: Record<string, unknown>): PostTemplate {
  return {
    id: data.id as string,
    name: data.name as string,
    description: data.description as string | undefined,
    contentType: data.content_type as string,
    titleTemplate: data.title_template as string | undefined,
    contentTemplate: data.content_template as string,
    excerptTemplate: data.excerpt_template as string | undefined,
    defaultCategoryId: data.default_category_id as string | undefined,
    defaultTags: data.default_tags as string[] | undefined,
    metadata: data.metadata as Record<string, unknown> | undefined,
    structure: data.structure as Record<string, unknown> | undefined,
    visibility: data.visibility as 'private' | 'team' | 'public',
    createdBy: data.created_by as string,
    useCount: data.use_count as number,
    lastUsedAt: data.last_used_at as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
    category: data.category as { id: string; name: string; slug: string } | undefined,
    author: data.author
      ? {
          username: (data.author as Record<string, string>).username,
          displayName: (data.author as Record<string, string>).display_name,
        }
      : undefined,
    variables: data.variables
      ? (data.variables as Array<Record<string, unknown>>).map((v) => ({
          id: v.id as string,
          templateId: v.template_id as string,
          name: v.name as string,
          label: v.label as string,
          description: v.description as string | undefined,
          variableType: v.variable_type as TemplateVariable['variableType'],
          options: v.options as TemplateVariable['options'],
          defaultValue: v.default_value as string | undefined,
          required: v.required as boolean,
          validationPattern: v.validation_pattern as string | undefined,
          sortOrder: v.sort_order as number,
        }))
      : undefined,
  };
}
