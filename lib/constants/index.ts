// Site information
export const SITE_NAME = 'Scroungers Multimedia';
export const SITE_DESCRIPTION = 'Political journalism from the people who live it. No credentials required. 100% your revenue.';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Content types
export const CONTENT_TYPES = [
  { id: 'written', label: 'Written', description: 'Articles, essays, poetry, screenplays, theses', icon: '📝' },
  { id: 'video', label: 'Video', description: 'Essays, documentaries, sketches, montages', icon: '🎬' },
  { id: 'audio', label: 'Audio', description: 'Podcasts, music, spoken word', icon: '🎙️' },
  { id: 'visual', label: 'Visual', description: 'Art, photography, cartoons, graphics', icon: '🎨' },
] as const;

// Topics for contributors
export const TOPICS = [
  'UK Politics',
  'International Politics',
  'Economics & Class',
  'Housing & Homelessness',
  'Health & Disability',
  'Environment & Climate',
  'Media & Culture',
  'Technology & Privacy',
  'History & Theory',
  'Satire & Comedy',
  'Benefits & Welfare',
  'Work & Labour',
] as const;

// Categories for posts
export const DEFAULT_CATEGORIES = [
  { name: 'Housing', slug: 'housing', color: '#32CD32', icon: '🏠' },
  { name: 'Economics', slug: 'economics', color: '#FFD700', icon: '💰' },
  { name: 'Health', slug: 'health', color: '#FF00FF', icon: '🏥' },
  { name: 'Benefits', slug: 'benefits', color: '#32CD32', icon: '📋' },
  { name: 'Culture', slug: 'culture', color: '#FFD700', icon: '🎭' },
  { name: 'Work', slug: 'work', color: '#32CD32', icon: '⚒️' },
  { name: 'Environment', slug: 'environment', color: '#32CD32', icon: '🌍' },
  { name: 'International', slug: 'international', color: '#FFD700', icon: '🌐' },
] as const;

// Reaction types
export const REACTION_TYPES = [
  { type: 'star', emoji: '⭐', label: 'Star', color: '#FFD700' },
  { type: 'fire', emoji: '🔥', label: 'Fire', color: '#FF4500' },
  { type: 'heart', emoji: '❤️', label: 'Heart', color: '#FF00FF' },
  { type: 'clap', emoji: '👏', label: 'Clap', color: '#32CD32' },
  { type: 'think', emoji: '🤔', label: 'Think', color: '#E0E0E0' },
] as const;

// User roles
export const USER_ROLES = {
  reader: { label: 'Reader', level: 0 },
  contributor: { label: 'Contributor', level: 1 },
  editor: { label: 'Editor', level: 2 },
  admin: { label: 'Admin', level: 3 },
  superadmin: { label: 'Super Admin', level: 4 },
} as const;

// Post statuses
export const POST_STATUSES = {
  draft: { label: 'Draft', color: '#6B7280' },
  pending: { label: 'Pending Review', color: '#F59E0B' },
  scheduled: { label: 'Scheduled', color: '#3B82F6' },
  published: { label: 'Published', color: '#10B981' },
  archived: { label: 'Archived', color: '#6B7280' },
  rejected: { label: 'Rejected', color: '#EF4444' },
} as const;

// Application statuses
export const APPLICATION_STATUSES = {
  pending: { label: 'Pending', color: '#F59E0B' },
  reviewing: { label: 'Under Review', color: '#3B82F6' },
  approved: { label: 'Approved', color: '#10B981' },
  rejected: { label: 'Rejected', color: '#EF4444' },
  waitlisted: { label: 'Waitlisted', color: '#6B7280' },
} as const;

// Navigation links
export const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/articles', label: 'Newsroom' },
  { href: '/articles?type=audio', label: 'Audio' },
  { href: '/articles?type=video', label: 'Video' },
] as const;

// Footer links
export const FOOTER_LINKS = {
  platform: [
    { href: '/about', label: 'About Us' },
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/contributors', label: 'Our Contributors' },
    { href: '/apply', label: 'Write For Us' },
  ],
  legal: [
    { href: '/terms', label: 'Terms of Service' },
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/content-guidelines', label: 'Content Guidelines' },
  ],
  support: [
    { href: '/donate', label: 'Donate' },
    { href: '/contact', label: 'Contact' },
    { href: '/faq', label: 'FAQ' },
  ],
} as const;

// Social links
export const SOCIAL_LINKS = {
  twitter: 'https://x.com/SCROUNGERSPODCAST',
  patreon: 'https://www.patreon.com/scroungers',
  kofi: 'https://ko-fi.com/scroungers',
} as const;

// Media constraints
export const MEDIA_CONSTRAINTS = {
  maxImageSize: 4 * 1024 * 1024, // 4MB
  maxVideoSize: 500 * 1024 * 1024, // 500MB
  maxAudioSize: 100 * 1024 * 1024, // 100MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
  allowedAudioTypes: ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/mp4'],
} as const;

// Pagination
export const ITEMS_PER_PAGE = 12;
export const MAX_ITEMS_PER_PAGE = 100;

// Editor limits
export const EDITOR_LIMITS = {
  titleMax: 200,
  subtitleMax: 300,
  excerptMax: 500,
  metaTitleMax: 60,
  metaDescriptionMax: 160,
  commentMax: 2000,
  bioMax: 500,
} as const;






