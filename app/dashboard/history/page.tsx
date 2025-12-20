/**
 * Reading History Page
 * Phase 3.4: Reading history and stats
 */

import { type Metadata } from 'next';
import { ReadingHistoryPageClient } from './ReadingHistoryPageClient';

export const metadata: Metadata = {
  title: 'Reading History | Scroungers Multimedia',
  description: 'View your reading history and statistics',
};

export default function ReadingHistoryPage() {
  return <ReadingHistoryPageClient />;
}
