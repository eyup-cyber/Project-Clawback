import { createClient } from '@/lib/supabase/server';
import { formatRelativeTime, getInitials } from '@/lib/utils';
import type { UserRole } from '@/types/database';

interface AdminUser {
  id: string;
  display_name: string;
  username: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  article_count: number;
}

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  const roleColors: Record<UserRole, { bg: string; text: string }> = {
    superadmin: { bg: 'var(--accent)', text: 'var(--background)' },
    admin: { bg: 'var(--accent)', text: 'var(--background)' },
    editor: { bg: 'var(--secondary)', text: 'var(--background)' },
    contributor: { bg: 'var(--primary)', text: 'var(--background)' },
    reader: { bg: 'var(--border)', text: 'var(--foreground)' },
  };

  return (
    <div>
      <div className="mb-8">
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--accent)' }}
        >
          Users
        </h1>
        <p style={{ color: 'var(--foreground)', opacity: 0.7, fontFamily: 'var(--font-body)' }}>
          Manage user accounts and permissions.
        </p>
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap gap-4 p-4 rounded-lg mb-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <select
          className="px-4 py-2 rounded-lg border"
          style={{
            background: 'var(--background)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
        >
          <option>All Roles</option>
          <option>Admin</option>
          <option>Contributor</option>
          <option>Reader</option>
        </select>
        <input
          type="search"
          placeholder="Search by name or email..."
          className="flex-1 px-4 py-2 rounded-lg border"
          style={{
            background: 'var(--background)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
        />
      </div>

      {/* Users table */}
      {users && users.length > 0 ? (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {/* Table header */}
          <div
            className="hidden md:grid md:grid-cols-5 gap-4 p-4 text-sm font-medium"
            style={{ background: 'var(--surface-elevated)', color: 'var(--foreground)', opacity: 0.7 }}
          >
            <div>User</div>
            <div>Email</div>
            <div>Role</div>
            <div>Joined</div>
            <div>Actions</div>
          </div>

          {/* Table rows */}
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {users.map((user: AdminUser) => (
              <div
                key={user.id}
                className="p-4 hover:bg-[var(--surface-elevated)] transition-colors md:grid md:grid-cols-5 md:gap-4 md:items-center"
              >
                {/* User */}
                <div className="flex items-center gap-3 mb-2 md:mb-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'var(--primary)', color: 'var(--background)' }}
                  >
                    {user.avatar_url ? (
                       
                      <img
                        src={user.avatar_url}
                        alt={user.display_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(user.display_name || 'U')
                    )}
                  </div>
                  <div>
                    <p
                      className="font-medium"
                      style={{ color: 'var(--foreground)', fontFamily: 'var(--font-body)' }}
                    >
                      {user.display_name || 'No name'}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: 'var(--foreground)', opacity: 0.5 }}
                    >
                      @{user.username || 'no-username'}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div
                  className="text-sm mb-2 md:mb-0"
                  style={{ color: 'var(--foreground)', opacity: 0.8 }}
                >
                  <span className="md:hidden font-medium mr-2">Email:</span>
                  {user.email || 'No email'}
                </div>

                {/* Role */}
                <div className="mb-2 md:mb-0">
                  <span className="md:hidden font-medium mr-2 text-sm" style={{ color: 'var(--foreground)' }}>
                    Role:
                  </span>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                    style={{
                      background: roleColors[user.role as keyof typeof roleColors]?.bg || 'var(--border)',
                      color: roleColors[user.role as keyof typeof roleColors]?.text || 'var(--foreground)',
                    }}
                  >
                    {user.role}
                  </span>
                </div>

                {/* Joined */}
                <div
                  className="text-sm mb-2 md:mb-0"
                  style={{ color: 'var(--foreground)', opacity: 0.6 }}
                >
                  <span className="md:hidden font-medium mr-2">Joined:</span>
                  {formatRelativeTime(user.created_at)}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    className="text-sm px-3 py-1 rounded hover:bg-[var(--background)]"
                    style={{ color: 'var(--primary)' }}
                  >
                    Edit
                  </button>
                  {user.role !== 'admin' && (
                    <button
                      className="text-sm px-3 py-1 rounded hover:bg-[var(--background)]"
                      style={{ color: user.role === 'contributor' ? 'var(--secondary)' : 'var(--primary)' }}
                    >
                      {user.role === 'contributor' ? 'Remove Contributor' : 'Make Contributor'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="p-12 rounded-lg border text-center"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <span className="text-6xl block mb-4">👥</span>
          <h2
            className="text-xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}
          >
            No users found
          </h2>
        </div>
      )}
    </div>
  );
}



