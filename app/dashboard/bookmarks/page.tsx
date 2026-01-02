/**
 * Bookmarks Page
 * Phase 1.1.3: Complete bookmarks management page
 */

import type { Metadata } from 'next';
import { BookmarksPageClient } from './BookmarksPageClient';

export const metadata: Metadata = {
  title: 'Bookmarks | Scroungers Multimedia',
  description: 'Manage your bookmarked articles',
};

export default function BookmarksPage() {
  return <BookmarksPageClient />;
}
