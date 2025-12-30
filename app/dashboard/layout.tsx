import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  if (!profile) {
    redirect('/auth/login');
  }

  // Contributors, editors, and admins only
  if (!['contributor', 'editor', 'admin', 'superadmin'].includes(profile.role)) {
    redirect('/apply');
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <DashboardHeader user={user} profile={profile} />
      <div className="flex">
        <DashboardSidebar role={profile.role} />
        <main className="flex-1 p-6 lg:p-8 ml-0 lg:ml-64 mt-16">{children}</main>
      </div>
    </div>
  );
}
