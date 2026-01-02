/**
 * Dashboard Home Page
 * Phase 3.1: Reader dashboard overview
 */

import type { Metadata } from 'next';
import { DashboardHomeClient } from './DashboardHomeClient';

export const metadata: Metadata = {
  title: 'Dashboard | Scroungers Multimedia',
  description: 'Your personalized dashboard',
};

export default function DashboardPage() {
  return <DashboardHomeClient />;
}
