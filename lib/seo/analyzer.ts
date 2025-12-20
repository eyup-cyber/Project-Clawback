/**
 * SEO Analyzer
 * Analyzes content for SEO optimization
 */

export interface SEOAnalysisResult {
  score: number; // 0-100
  issues: SEOIssue[];
  suggestions: string[];
  meta: {
    titleLength: number;
    descriptionLength: number;
    wordCount: number;
    readingTime: number;
    keywordDensity?: Record<string, number>;
  };
}

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
}

export interface SEOInput {
  title: string;
  description?: string;
  content: string;
  url?: string;
  focusKeyword?: string;
  headings?: string[];
  images?: Array<{ src: string; alt?: string }>;
  links?: Array<{ href: string; text: string; isExternal: boolean }>;
}

// Recommended ranges
const TITLE_MIN_LENGTH = 30;
const TITLE_MAX_LENGTH = 60;
const DESCRIPTION_MIN_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 160;
const MIN_WORD_COUNT = 300;
const IDEAL_WORD_COUNT = 1500;
const MAX_KEYWORD_DENSITY = 0.03; // 3%
const MIN_KEYWORD_DENSITY = 0.005; // 0.5%

/**
 * Analyze content for SEO
 */
export function analyzeContent(input: SEOInput): SEOAnalysisResult {
  const issues: SEOIssue[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Clean content from HTML
  const plainContent = stripHtml(input.content);
  const words = getWords(plainContent);
  const wordCount = words.length;
  const readingTime = Math.ceil(wordCount / 200); // ~200 WPM

  // Title analysis
  const titleAnalysis = analyzeTitle(input.title, input.focusKeyword);
  issues.push(...titleAnalysis.issues);
  suggestions.push(...titleAnalysis.suggestions);
  score -= titleAnalysis.penalty;

  // Description analysis
  if (input.description) {
    const descAnalysis = analyzeDescription(input.description, input.focusKeyword);
    issues.push(...descAnalysis.issues);
    suggestions.push(...descAnalysis.suggestions);
    score -= descAnalysis.penalty;
  } else {
    issues.push({
      type: 'warning',
      code: 'missing_description',
      message: 'Meta description is missing',
      impact: 'medium',
    });
    score -= 10;
    suggestions.push('Add a meta description between 120-160 characters');
  }

  // Content length analysis
  const contentAnalysis = analyzeContentLength(wordCount);
  issues.push(...contentAnalysis.issues);
  suggestions.push(...contentAnalysis.suggestions);
  score -= contentAnalysis.penalty;

  // Keyword analysis
  let keywordDensity: Record<string, number> | undefined;
  if (input.focusKeyword) {
    const kwAnalysis = analyzeKeyword(input.focusKeyword, plainContent, words.length);
    issues.push(...kwAnalysis.issues);
    suggestions.push(...kwAnalysis.suggestions);
    score -= kwAnalysis.penalty;
    keywordDensity = { [input.focusKeyword]: kwAnalysis.density };
  }

  // Heading analysis
  if (input.headings) {
    const headingAnalysis = analyzeHeadings(input.headings, input.focusKeyword);
    issues.push(...headingAnalysis.issues);
    suggestions.push(...headingAnalysis.suggestions);
    score -= headingAnalysis.penalty;
  }

  // Image analysis
  if (input.images) {
    const imageAnalysis = analyzeImages(input.images);
    issues.push(...imageAnalysis.issues);
    suggestions.push(...imageAnalysis.suggestions);
    score -= imageAnalysis.penalty;
  }

  // Link analysis
  if (input.links) {
    const linkAnalysis = analyzeLinks(input.links);
    issues.push(...linkAnalysis.issues);
    suggestions.push(...linkAnalysis.suggestions);
    score -= linkAnalysis.penalty;
  }

  // URL analysis
  if (input.url) {
    const urlAnalysis = analyzeUrl(input.url, input.focusKeyword);
    issues.push(...urlAnalysis.issues);
    suggestions.push(...urlAnalysis.suggestions);
    score -= urlAnalysis.penalty;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    issues: issues.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    }),
    suggestions: [...new Set(suggestions)], // Remove duplicates
    meta: {
      titleLength: input.title.length,
      descriptionLength: input.description?.length || 0,
      wordCount,
      readingTime,
      keywordDensity,
    },
  };
}

function analyzeTitle(title: string, focusKeyword?: string) {
  const issues: SEOIssue[] = [];
  const suggestions: string[] = [];
  let penalty = 0;

  if (title.length < TITLE_MIN_LENGTH) {
    issues.push({
      type: 'warning',
      code: 'title_too_short',
      message: `Title is too short (${title.length} characters). Aim for ${TITLE_MIN_LENGTH}-${TITLE_MAX_LENGTH} characters.`,
      impact: 'medium',
    });
    penalty += 5;
    suggestions.push(`Expand your title to at least ${TITLE_MIN_LENGTH} characters`);
  } else if (title.length > TITLE_MAX_LENGTH) {
    issues.push({
      type: 'warning',
      code: 'title_too_long',
      message: `Title may be truncated in search results (${title.length} characters). Keep it under ${TITLE_MAX_LENGTH} characters.`,
      impact: 'medium',
    });
    penalty += 5;
    suggestions.push(`Shorten your title to ${TITLE_MAX_LENGTH} characters or less`);
  }

  if (focusKeyword && !title.toLowerCase().includes(focusKeyword.toLowerCase())) {
    issues.push({
      type: 'warning',
      code: 'keyword_not_in_title',
      message: 'Focus keyword does not appear in the title',
      impact: 'high',
    });
    penalty += 10;
    suggestions.push(`Include "${focusKeyword}" in your title`);
  }

  // Check if keyword is at the beginning
  if (focusKeyword && !title.toLowerCase().startsWith(focusKeyword.toLowerCase())) {
    suggestions.push('Consider placing the focus keyword at the beginning of the title');
  }

  return { issues, suggestions, penalty };
}

function analyzeDescription(description: string, focusKeyword?: string) {
  const issues: SEOIssue[] = [];
  const suggestions: string[] = [];
  let penalty = 0;

  if (description.length < DESCRIPTION_MIN_LENGTH) {
    issues.push({
      type: 'warning',
      code: 'description_too_short',
      message: `Meta description is too short (${description.length} characters). Aim for ${DESCRIPTION_MIN_LENGTH}-${DESCRIPTION_MAX_LENGTH} characters.`,
      impact: 'medium',
    });
    penalty += 5;
  } else if (description.length > DESCRIPTION_MAX_LENGTH) {
    issues.push({
      type: 'warning',
      code: 'description_too_long',
      message: `Meta description may be truncated (${description.length} characters). Keep it under ${DESCRIPTION_MAX_LENGTH} characters.`,
      impact: 'low',
    });
    penalty += 3;
  }

  if (focusKeyword && !description.toLowerCase().includes(focusKeyword.toLowerCase())) {
    issues.push({
      type: 'warning',
      code: 'keyword_not_in_description',
      message: 'Focus keyword does not appear in the meta description',
      impact: 'medium',
    });
    penalty += 5;
    suggestions.push(`Include "${focusKeyword}" in your meta description`);
  }

  return { issues, suggestions, penalty };
}

function analyzeContentLength(wordCount: number) {
  const issues: SEOIssue[] = [];
  const suggestions: string[] = [];
  let penalty = 0;

  if (wordCount < MIN_WORD_COUNT) {
    issues.push({
      type: 'warning',
      code: 'content_too_short',
      message: `Content is thin (${wordCount} words). Aim for at least ${MIN_WORD_COUNT} words.`,
      impact: 'high',
    });
    penalty += 15;
    suggestions.push(`Add more content to reach at least ${MIN_WORD_COUNT} words`);
  } else if (wordCount < IDEAL_WORD_COUNT) {
    suggestions.push(
      `Consider expanding your content to ${IDEAL_WORD_COUNT}+ words for better SEO`
    );
  }

  return { issues, suggestions, penalty };
}

function analyzeKeyword(keyword: string, content: string, wordCount: number) {
  const issues: SEOIssue[] = [];
  const suggestions: string[] = [];
  let penalty = 0;

  const keywordLower = keyword.toLowerCase();
  const contentLower = content.toLowerCase();
  const keywordCount = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
  const density = wordCount > 0 ? keywordCount / wordCount : 0;

  if (keywordCount === 0) {
    issues.push({
      type: 'error',
      code: 'keyword_missing',
      message: 'Focus keyword does not appear in the content',
      impact: 'high',
    });
    penalty += 20;
    suggestions.push(`Include "${keyword}" in your content`);
  } else if (density > MAX_KEYWORD_DENSITY) {
    issues.push({
      type: 'warning',
      code: 'keyword_stuffing',
      message: `Keyword density is too high (${(density * 100).toFixed(1)}%). This may be seen as keyword stuffing.`,
      impact: 'high',
    });
    penalty += 15;
    suggestions.push('Reduce keyword usage to avoid appearing spammy');
  } else if (density < MIN_KEYWORD_DENSITY) {
    issues.push({
      type: 'info',
      code: 'keyword_density_low',
      message: `Keyword density is low (${(density * 100).toFixed(1)}%). Consider using the keyword more naturally.`,
      impact: 'low',
    });
    penalty += 3;
  }

  return { issues, suggestions, penalty, density };
}

function analyzeHeadings(headings: string[], focusKeyword?: string) {
  const issues: SEOIssue[] = [];
  const suggestions: string[] = [];
  let penalty = 0;

  if (headings.length === 0) {
    issues.push({
      type: 'warning',
      code: 'no_headings',
      message: 'Content has no headings. Use headings to structure your content.',
      impact: 'medium',
    });
    penalty += 10;
    suggestions.push('Add H2 and H3 headings to structure your content');
  }

  if (focusKeyword) {
    const hasKeywordInHeading = headings.some((h) =>
      h.toLowerCase().includes(focusKeyword.toLowerCase())
    );
    if (!hasKeywordInHeading) {
      issues.push({
        type: 'info',
        code: 'keyword_not_in_headings',
        message: 'Focus keyword does not appear in any heading',
        impact: 'low',
      });
      penalty += 3;
      suggestions.push(`Include "${focusKeyword}" in at least one subheading`);
    }
  }

  return { issues, suggestions, penalty };
}

function analyzeImages(images: Array<{ src: string; alt?: string }>) {
  const issues: SEOIssue[] = [];
  const suggestions: string[] = [];
  let penalty = 0;

  const missingAlt = images.filter((img) => !img.alt || img.alt.trim() === '');

  if (missingAlt.length > 0) {
    issues.push({
      type: 'warning',
      code: 'images_missing_alt',
      message: `${missingAlt.length} image(s) are missing alt text`,
      impact: 'medium',
    });
    penalty += missingAlt.length * 2;
    suggestions.push('Add descriptive alt text to all images');
  }

  if (images.length === 0) {
    suggestions.push('Consider adding relevant images to enhance your content');
  }

  return { issues, suggestions, penalty };
}

function analyzeLinks(links: Array<{ href: string; text: string; isExternal: boolean }>) {
  const issues: SEOIssue[] = [];
  const suggestions: string[] = [];
  let penalty = 0;

  const internalLinks = links.filter((l) => !l.isExternal);
  const externalLinks = links.filter((l) => l.isExternal);

  if (internalLinks.length === 0) {
    issues.push({
      type: 'info',
      code: 'no_internal_links',
      message: 'Content has no internal links',
      impact: 'low',
    });
    penalty += 3;
    suggestions.push('Add internal links to related content on your site');
  }

  if (externalLinks.length === 0) {
    suggestions.push('Consider adding external links to authoritative sources');
  }

  // Check for generic anchor text
  const genericTexts = ['click here', 'read more', 'here', 'link'];
  const genericLinks = links.filter((l) => genericTexts.includes(l.text.toLowerCase().trim()));

  if (genericLinks.length > 0) {
    issues.push({
      type: 'warning',
      code: 'generic_anchor_text',
      message: `${genericLinks.length} link(s) use generic anchor text`,
      impact: 'low',
    });
    penalty += 2;
    suggestions.push('Use descriptive anchor text instead of generic phrases like "click here"');
  }

  return { issues, suggestions, penalty };
}

function analyzeUrl(url: string, focusKeyword?: string) {
  const issues: SEOIssue[] = [];
  const suggestions: string[] = [];
  let penalty = 0;

  const urlPath = new URL(url, 'http://example.com').pathname;

  if (urlPath.length > 75) {
    issues.push({
      type: 'warning',
      code: 'url_too_long',
      message: 'URL is very long. Shorter URLs tend to perform better.',
      impact: 'low',
    });
    penalty += 3;
    suggestions.push('Consider shortening the URL');
  }

  if (
    focusKeyword &&
    !urlPath.toLowerCase().includes(focusKeyword.toLowerCase().replace(/\s+/g, '-'))
  ) {
    issues.push({
      type: 'info',
      code: 'keyword_not_in_url',
      message: 'Focus keyword does not appear in the URL',
      impact: 'low',
    });
    penalty += 2;
    suggestions.push(`Include "${focusKeyword}" in the URL slug`);
  }

  // Check for underscores (should use hyphens)
  if (urlPath.includes('_')) {
    suggestions.push('Use hyphens (-) instead of underscores (_) in URLs');
  }

  return { issues, suggestions, penalty };
}

// Utility functions
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

/**
 * Generate SEO-friendly excerpt
 */
export function generateExcerpt(content: string, maxLength: number = 160): string {
  const plain = stripHtml(content);
  if (plain.length <= maxLength) return plain;

  // Try to cut at sentence boundary
  const truncated = plain.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');

  if (lastSentence > maxLength * 0.5) {
    return truncated.substring(0, lastSentence + 1);
  }

  // Cut at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.substring(0, lastSpace) + '...';
}

/**
 * Generate URL slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .trim()
    .substring(0, 75); // Limit length
}
