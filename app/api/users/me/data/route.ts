/**
 * GDPR Data Export API
 * Export all user data in JSON format
 */

import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { success, error as apiError, applySecurityHeaders } from '@/lib/api';
import { logger } from '@/lib/logger';
import { exportUserData } from '@/lib/compliance/gdpr';

/**
 * GET /api/users/me/data
 * Export all user data (GDPR data portability)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return applySecurityHeaders(apiError('Authentication required', 'UNAUTHORIZED', 401));
    }

    // Get format preference
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    if (format !== 'json' && format !== 'csv') {
      return applySecurityHeaders(
        apiError('Unsupported format. Use json or csv', 'VALIDATION_ERROR', 400)
      );
    }

    // Export user data
    logger.info('Data export requested', { userId: user.id });

    const userData = await exportUserData(user.id);

    if (!userData) {
      return applySecurityHeaders(apiError('Failed to export data', 'INTERNAL_ERROR', 500));
    }

    // Add export metadata
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: user.id,
      email: user.email,
      format,
      data: userData,
    };

    if (format === 'json') {
      return new Response(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="user-data-${user.id}-${Date.now()}.json"`,
        },
      });
    }

    // CSV format - flatten data
    const csvContent = convertToCSV(exportData);
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="user-data-${user.id}-${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    logger.error('Data export error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Failed to export data', 'INTERNAL_ERROR', 500));
  }
}

/**
 * POST /api/users/me/data
 * Request a full data export (for large datasets, sends via email)
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return applySecurityHeaders(apiError('Authentication required', 'UNAUTHORIZED', 401));
    }

    // Check for existing pending request
    const { data: existingRequest } = await supabase
      .from('data_export_requests')
      .select('id, created_at, status')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return applySecurityHeaders(
        apiError('A data export request is already pending', 'CONFLICT', 409, {
          requestedAt: existingRequest.created_at,
        })
      );
    }

    // Create export request
    const { data: exportRequest, error: insertError } = await supabase
      .from('data_export_requests')
      .insert({
        user_id: user.id,
        email: user.email,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      // Table might not exist yet, fall back to immediate export
      logger.warn('data_export_requests table not found, performing immediate export');

      const userData = await exportUserData(user.id);
      return applySecurityHeaders(
        success({
          message: 'Data export completed',
          data: userData,
        })
      );
    }

    // Queue background job for export
    // In production, this would queue a job to compile and email the data
    logger.info('Data export request created', {
      userId: user.id,
      requestId: exportRequest.id,
    });

    return applySecurityHeaders(
      success({
        message: 'Data export request submitted. You will receive an email when ready.',
        requestId: exportRequest.id,
        estimatedTime: '24 hours',
      })
    );
  } catch (err) {
    logger.error('Data export request error', err instanceof Error ? err : new Error(String(err)));
    return applySecurityHeaders(apiError('Failed to request data export', 'INTERNAL_ERROR', 500));
  }
}

/**
 * Convert nested object to CSV format
 */
function convertToCSV(data: Record<string, unknown>): string {
  const rows: string[] = [];

  // Header
  rows.push('Section,Field,Value');

  // Flatten data
  function flatten(obj: unknown, prefix: string = '') {
    if (obj === null || obj === undefined) {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        flatten(item, `${prefix}[${index}]`);
      });
    } else if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        flatten(value, prefix ? `${prefix}.${key}` : key);
      }
    } else {
      const section = prefix.split('.')[0];
      const field = prefix.split('.').slice(1).join('.');
      const escapedValue = String(obj).replace(/"/g, '""');
      rows.push(`"${section}","${field || 'value'}","${escapedValue}"`);
    }
  }

  flatten(data);

  return rows.join('\n');
}
