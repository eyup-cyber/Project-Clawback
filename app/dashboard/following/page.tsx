/**
 * Following Page
 * Phase 1.1.5: Following management page
 */

import { type Metadata } from 'next';
import { FollowingPageClient } from './FollowingPageClient';

export const metadata: Metadata = {
  title: 'Following | Scroungers Multimedia',
  description: 'Manage who and what you follow',
};

export default function FollowingPage() {
  return <FollowingPageClient />;
}
