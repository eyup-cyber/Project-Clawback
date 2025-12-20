/**
 * Followed Categories Component
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FollowButton } from '@/app/components/dashboard/FollowButton';
import EmptyState from '@/app/components/dashboard/shared/EmptyState';

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  image_url: string | null;
  post_count: number;
}

interface FollowedCategoriesProps {
  categories: Category[];
}

export function FollowedCategories({ categories }: FollowedCategoriesProps) {
  if (categories.length === 0) {
    return (
      <EmptyState
        title="Not following any categories yet"
        description="Follow categories to personalize your feed"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {categories.map((category) => (
        <div
          key={category.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden group hover:shadow-md transition-shadow"
        >
          {category.image_url && (
            <div className="relative w-full h-32">
              <Image
                src={category.image_url}
                alt={category.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            </div>
          )}

          <div className="p-4">
            <Link
              href={`/categories/${category.slug}`}
              className="block font-semibold text-lg mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
              style={{
                color: category.color || undefined,
              }}
            >
              {category.name}
            </Link>

            <div className="text-sm text-gray-500 mb-4">{category.post_count} articles</div>

            <FollowButton
              type="category"
              id={category.id}
              initialFollowing={true}
              className="w-full justify-center"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
