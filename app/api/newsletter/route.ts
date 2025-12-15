import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { parseBody, newsletterSubscribeSchema, newsletterUnsubscribeSchema } from '@/lib/api';

export async function POST(request: Request) {
  const { email, source } = await parseBody(request, newsletterSubscribeSchema);

  const supabase = await createClient();

  // Check if already subscribed
  const { data: existing } = await supabase
    .from('newsletter_subscribers')
    .select('id, status')
    .eq('email', email.toLowerCase())
    .single();

  if (existing) {
    if (existing.status === 'active') {
      return NextResponse.json({ error: 'This email is already subscribed' }, { status: 409 });
    } else {
      // Reactivate subscription
      const { error } = await supabase
        .from('newsletter_subscribers')
        .update({ status: 'active', resubscribed_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to resubscribe. Please try again.' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: true, message: 'Welcome back! You\'ve been resubscribed.' },
        { status: 200 }
      );
    }
  }

  // Create new subscription
  const { error } = await supabase
    .from('newsletter_subscribers')
    .insert({
      email: email.toLowerCase(),
      status: 'active',
      source: source || 'website',
    });

  if (error) {
    logger.error('Newsletter subscription error', error, { email });
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: true, message: 'Thanks for subscribing! Check your inbox for updates.' },
    { status: 201 }
  );
}

// Unsubscribe
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = newsletterUnsubscribeSchema.safeParse({
    email: searchParams.get('email'),
    token: searchParams.get('token') || undefined,
  });

  if (!params.success) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const email = params.data.email;
  const supabase = await createClient();

  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    .eq('email', email.toLowerCase());

  if (error) {
    logger.error('Newsletter unsubscribe error', error, { email });
    return NextResponse.json(
      { error: 'Failed to unsubscribe. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: true, message: 'You have been unsubscribed.' },
    { status: 200 }
  );
}

