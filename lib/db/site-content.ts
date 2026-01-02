import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

export interface SiteContent {
  mission_statement: {
    paragraphs: string[];
  };
  pillars: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  how_it_works: Array<{
    number: string;
    title: string;
    description: string;
    icon: string;
  }>;
  about_quote: {
    text: string;
    highlight: string;
  };
}

const DEFAULT_CONTENT: SiteContent = {
  mission_statement: {
    paragraphs: [
      'For years, the left media has been owned, controlled, and profited by two friend groups.',
      'We are taking back the media and giving you the keys.',
      'Want to write an article? Want to make a video? Want to make some art?',
      'scroungers multimedia is giving real people with skin in the game the opportunity to profit from their own political analysis.',
      'All posts come with a user-inputted Ko-fi link. Want to support the creator? Go ahead!',
      "We retain 0% of the creators' intellectual property and we don't take a penny from their profit.",
    ],
  },
  pillars: [
    {
      title: 'No Gatekeepers',
      description:
        'No journalism degrees required. If you have skin in the game and a story to tell, you belong here.',
      icon: '🚪',
    },
    {
      title: '100% Creator Revenue',
      description: 'We pass every penny of donations directly to creators. Your work, your profit.',
      icon: '💰',
    },
    {
      title: 'Full IP Ownership',
      description: 'You retain complete intellectual property rights to everything you create.',
      icon: '📜',
    },
    {
      title: 'Marginalized Voices First',
      description:
        'Perspectives from those most affected—not commentators watching from the sidelines.',
      icon: '📢',
    },
  ],
  how_it_works: [
    {
      number: '01',
      title: 'Apply',
      description: 'Fill out a simple application. No credentials needed—just passion.',
      icon: '📝',
    },
    {
      number: '02',
      title: 'Create',
      description: 'Use our editor to write, embed videos, and craft your content.',
      icon: '✨',
    },
    {
      number: '03',
      title: 'Publish',
      description: 'Quick review, published within 48 hours. Your voice, unfiltered.',
      icon: '🚀',
    },
    {
      number: '04',
      title: 'Earn',
      description: 'Add your Ko-fi link. Every penny goes to you—we take 0%.',
      icon: '💰',
    },
  ],
  about_quote: {
    text: '"Scrounger" is what they call us. We\'re reclaiming the word—because the so-called scroungers understand these systems best. Not from textbooks, but from lived experience.',
    highlight: 'Our "low esteem" is our authority.',
  },
};

/**
 * Get site content from database or return defaults
 */
export async function getSiteContent(): Promise<SiteContent> {
  const supabase = await createClient();

  const { data: settings, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['mission_statement', 'pillars', 'how_it_works', 'about_quote']);

  if (error) {
    logger.error('Error fetching site content', error);
    return DEFAULT_CONTENT;
  }

  const content: Partial<SiteContent> = {};

  settings?.forEach((setting) => {
    try {
      const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;

      if (setting.key === 'mission_statement') {
        content.mission_statement = parsed;
      } else if (setting.key === 'pillars') {
        content.pillars = parsed;
      } else if (setting.key === 'how_it_works') {
        content.how_it_works = parsed;
      } else if (setting.key === 'about_quote') {
        content.about_quote = parsed;
      }
    } catch {
      // If parsing fails, skip this setting
    }
  });

  return {
    mission_statement: content.mission_statement || DEFAULT_CONTENT.mission_statement,
    pillars: content.pillars || DEFAULT_CONTENT.pillars,
    how_it_works: content.how_it_works || DEFAULT_CONTENT.how_it_works,
    about_quote: content.about_quote || DEFAULT_CONTENT.about_quote,
  };
}

/**
 * Update site content (admin only)
 */
export async function updateSiteContent(
  key: 'mission_statement' | 'pillars' | 'how_it_works' | 'about_quote',
  value: any
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('site_settings').upsert({
    key,
    value: typeof value === 'string' ? value : JSON.stringify(value),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    logger.error('Error updating site content', error, { key });
    throw new Error('Failed to update site content');
  }
}
