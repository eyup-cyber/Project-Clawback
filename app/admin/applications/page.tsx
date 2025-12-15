import { createClient } from '@/lib/supabase/server';
import { formatRelativeTime } from '@/lib/utils';
import ApplicationActions from './ApplicationActions';

interface ApplicationUser {
  id: string;
  display_name: string;
  username: string;
  email: string;
  avatar_url: string | null;
}

interface Application {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'waitlisted';
  first_piece_pitch: string;
  why_scroungers: string;
  content_types: string[];
  topics: string[];
  portfolio_url: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  user: ApplicationUser | null;
}

export default async function ApplicationsPage() {
  const supabase = await createClient();

  const { data: applications } = await supabase
    .from('contributor_applications')
    .select(`
      *,
      user:profiles!contributor_applications_user_id_fkey(id, display_name, username, email, avatar_url)
    `)
    .order('created_at', { ascending: false });

  const statusColors: Record<string, { bg: string; text: string }> = {
    pending: { bg: 'var(--secondary)', text: 'var(--background)' },
    reviewing: { bg: 'var(--border)', text: 'var(--foreground)' },
    approved: { bg: 'var(--primary)', text: 'var(--background)' },
    rejected: { bg: 'var(--accent)', text: 'var(--background)' },
    waitlisted: { bg: 'var(--border)', text: 'var(--foreground)' },
  };

  return (
    <div>
      <div className="mb-8">
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--accent)' }}
        >
          Contributor Applications
        </h1>
        <p style={{ color: 'var(--foreground)', opacity: 0.7, fontFamily: 'var(--font-body)' }}>
          Review and manage contributor applications.
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
          <option>All Status</option>
          <option>Pending</option>
          <option>Approved</option>
          <option>Rejected</option>
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

      {/* Applications list */}
      {applications && applications.length > 0 ? (
        <div className="space-y-4">
          {(applications as Application[]).map((app) => (
            <div
              key={app.id}
              className="p-6 rounded-lg border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                    style={{ background: 'var(--primary)', color: 'var(--background)' }}
                  >
                    {app.user?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={app.user.avatar_url}
                        alt={app.user.display_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      app.full_name?.[0] || app.user?.display_name?.[0] || '?'
                    )}
                  </div>

                  <div>
                    <h3
                      className="font-bold text-lg"
                      style={{ color: 'var(--foreground)', fontFamily: 'var(--font-body)' }}
                    >
                      {app.full_name || app.user?.display_name || 'Unknown User'}
                    </h3>
                    <p
                      className="text-sm"
                      style={{ color: 'var(--foreground)', opacity: 0.6 }}
                    >
                      {app.email || app.user?.email} • Applied {formatRelativeTime(app.created_at)}
                    </p>
                  </div>
                </div>

                <span
                  className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                  style={{
                    background: statusColors[app.status]?.bg || 'var(--border)',
                    color: statusColors[app.status]?.text || 'var(--foreground)',
                  }}
                >
                  {app.status}
                </span>
              </div>

              {/* Application details */}
              <div className="mt-4 space-y-3">
                <div>
                  <h4
                    className="text-sm font-medium mb-1"
                    style={{ color: 'var(--primary)' }}
                  >
                    Why Scroungers Multimedia?
                  </h4>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--foreground)', opacity: 0.8 }}
                  >
                    {app.why_scroungers || 'No response provided'}
                  </p>
                </div>

                <div>
                  <h4
                    className="text-sm font-medium mb-1"
                    style={{ color: 'var(--primary)' }}
                  >
                    First Piece Pitch
                  </h4>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--foreground)', opacity: 0.8 }}
                  >
                    {app.first_piece_pitch || 'No response provided'}
                  </p>
                </div>

                {app.topics && app.topics.length > 0 && (
                  <div>
                    <h4
                      className="text-sm font-medium mb-1"
                      style={{ color: 'var(--primary)' }}
                    >
                      Topics of Interest
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {app.topics.map((topic) => (
                        <span
                          key={topic}
                          className="px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--background)', color: 'var(--foreground)' }}
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {app.content_types && app.content_types.length > 0 && (
                  <div>
                    <h4
                      className="text-sm font-medium mb-1"
                      style={{ color: 'var(--primary)' }}
                    >
                      Content Types
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {app.content_types.map((type) => (
                        <span
                          key={type}
                          className="px-2 py-1 rounded text-xs capitalize"
                          style={{ background: 'var(--background)', color: 'var(--foreground)' }}
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {app.portfolio_url && (
                  <div>
                    <h4
                      className="text-sm font-medium mb-1"
                      style={{ color: 'var(--primary)' }}
                    >
                      Portfolio / Sample Work
                    </h4>
                    <a
                      href={app.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline"
                      style={{ color: 'var(--secondary)' }}
                    >
                      {app.portfolio_url}
                    </a>
                  </div>
                )}
              </div>

              {/* Actions */}
              {app.status === 'pending' && app.user_id && (
                <ApplicationActions applicationId={app.id} userId={app.user_id} />
              )}

              {app.status !== 'pending' && app.reviewed_at && (
                <div
                  className="mt-4 pt-4 border-t text-sm"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)', opacity: 0.6 }}
                >
                  Reviewed {formatRelativeTime(app.reviewed_at)}
                  {app.reviewer_notes && ` • Note: ${app.reviewer_notes}`}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="p-12 rounded-lg border text-center"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <span className="text-6xl block mb-4">📋</span>
          <h2
            className="text-xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}
          >
            No applications
          </h2>
          <p style={{ color: 'var(--foreground)', opacity: 0.6, fontFamily: 'var(--font-body)' }}>
            No contributor applications have been submitted yet.
          </p>
        </div>
      )}
    </div>
  );
}
