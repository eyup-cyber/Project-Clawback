import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';
import { logger } from '@/lib/logger';

type Category = Database['public']['Tables']['categories']['Row'];
type CategoryWithCount = Category & { post_count: number };

/**
 * Get all categories
 */
export async function getCategories(includeCounts = false): Promise<Category[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching categories', error);
    throw new Error('Failed to fetch categories');
  }

  return data || [];
}

/**
 * Get categories with post counts
 */
export async function getCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const supabase = await createClient();
  
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching categories', error);
    throw new Error('Failed to fetch categories');
  }

  if (!categories || categories.length === 0) {
    return [];
  }

  // Get post counts for each category
  const categoryIds = categories.map(c => c.id);
  const { data: posts } = await supabase
    .from('posts')
    .select('category_id')
    .in('category_id', categoryIds)
    .eq('status', 'published');

  const countMap = new Map<string, number>();
  posts?.forEach((post) => {
    if (post.category_id) {
      countMap.set(
        post.category_id,
        (countMap.get(post.category_id) || 0) + 1
      );
    }
  });

  return categories.map((cat) => ({
    ...cat,
    post_count: countMap.get(cat.id) || 0,
  }));
}

/**
 * Get a single category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    logger.error('Error fetching category', error, { slug });
    throw new Error('Failed to fetch category');
  }

  return data;
}




