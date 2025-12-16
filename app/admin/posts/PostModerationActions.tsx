'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface PostModerationActionsProps {
  postId: string;
  postTitle: string;
}

export default function PostModerationActions({ postId, postTitle }: PostModerationActionsProps) {
  const [loading, setLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handlePublish = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (error) throw error;

      toast.success(`"${postTitle}" has been published!`);
      router.refresh();
    } catch (error) {
      console.error('Publish error:', error);
      toast.error('Failed to publish post');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          status: 'draft',
          moderation_notes: rejectReason,
        })
        .eq('id', postId);

      if (error) throw error;

      toast.success('Post returned to draft with feedback');
      setShowRejectModal(false);
      router.refresh();
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Failed to reject post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mt-3 pt-3 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => void handlePublish()}
          disabled={loading}
          className="px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'var(--background)' }}
        >
          {loading ? 'Processing...' : '✓ Publish'}
        </button>
        <button
          onClick={() => setShowRejectModal(true)}
          disabled={loading}
          className="px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
          style={{ border: '1px solid var(--secondary)', color: 'var(--secondary)' }}
        >
          ↩ Request Changes
        </button>
        <button
          disabled={loading}
          className="px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
          style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}
        >
          ✕ Reject
        </button>
      </div>

      {/* Reject/feedback modal */}
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
              style={{ color: 'var(--secondary)', fontFamily: 'var(--font-kindergarten)' }}
            >
              Request Changes
            </h3>
            <p className="mb-4 text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              Provide feedback for the author. The post will be returned to draft status.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="What changes are needed?"
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
                disabled={loading || !rejectReason.trim()}
                className="px-4 py-2 rounded-lg disabled:opacity-50"
                style={{ background: 'var(--secondary)', color: 'var(--background)' }}
              >
                {loading ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



