'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface ApplicationActionsProps {
  applicationId: string;
  userId: string;
}

export default function ApplicationActions({ applicationId, userId }: ApplicationActionsProps) {
  const [loading, setLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleApprove = async () => {
    setLoading(true);
    try {
      // Update application status - using type assertion to bypass strict typing
      const { error: appError } = await (supabase as any)
        .from('contributor_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (appError) throw appError;

      // Update user role to contributor
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ role: 'contributor' })
        .eq('id', userId);

      if (profileError) throw profileError;

      toast.success('Application approved! User is now a contributor.');
      router.refresh();
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve application');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('contributor_applications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewer_notes: rejectReason,
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success('Application rejected');
      setShowRejectModal(false);
      router.refresh();
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error('Failed to reject application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mt-4 pt-4 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => void handleApprove()}
          disabled={loading}
          className="px-4 py-2 rounded-lg font-medium disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'var(--background)' }}
        >
          {loading ? 'Processing...' : '✓ Approve'}
        </button>
        <button
          onClick={() => setShowRejectModal(true)}
          disabled={loading}
          className="px-4 py-2 rounded-lg font-medium disabled:opacity-50"
          style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}
        >
          ✕ Reject
        </button>
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="p-6 rounded-lg w-full max-w-md"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-lg font-bold mb-4"
              style={{ color: 'var(--accent)', fontFamily: 'var(--font-kindergarten)' }}
            >
              Reject Application
            </h3>
            <p className="mb-4 text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              Please provide a reason for rejection. This will be saved for reference.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={4}
              className="w-full p-3 rounded-lg border mb-4 resize-none"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-lg"
                style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleReject()}
                disabled={loading}
                className="px-4 py-2 rounded-lg"
                style={{ background: 'var(--accent)', color: 'var(--background)' }}
              >
                {loading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
