import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';

export default async function EditorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  if (!profile) {
    redirect('/login');
  }

  // Editors, admins, and superadmins only
  if (!['editor', 'admin', 'superadmin'].includes(profile.role)) {
    redirect('/dashboard');
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
