/**
 * Posts List Page
 * Phase 1.2.2: Server component wrapper for posts list
 */

import type { Metadata } from 'next';
import { PostsListClient } from './PostsListClient';

export const metadata: Metadata = {
  title: 'My Posts | Scroungers Multimedia',
  description: 'Manage your posts and content',
};

export default function PostsPage() {
  return <PostsListClient />;
}
