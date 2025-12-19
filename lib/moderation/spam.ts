/**
 * Spam Detection
 * Detects spam patterns in content
 */

export interface SpamCheckResult {
  isSpam: boolean;
  confidence: number;
  reasons: string[];
}

// Common spam patterns
const SPAM_PATTERNS = [
  // URL patterns
  /https?:\/\/[^\s]+/gi,
  // Excessive caps
  /[A-Z]{10,}/g,
  // Repeated characters
  /(.)\1{5,}/g,
  // Common spam phrases
  /free money/gi,
  /click here/gi,
  /act now/gi,
  /limited time/gi,
  /congratulations.*won/gi,
  /casino|gambling|poker/gi,
  /cheap\s+\w+\s+online/gi,
  /buy\s+\w+\s+cheap/gi,
  // Email harvesting
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
];

// Spam keywords with weights
const SPAM_KEYWORDS: Record<string, number> = {
  'free': 0.1,
  'win': 0.1,
  'winner': 0.15,
  'prize': 0.15,
  'click': 0.1,
  'subscribe': 0.05,
  'offer': 0.1,
  'deal': 0.05,
  'discount': 0.1,
  'promotion': 0.1,
  'limited': 0.1,
  'exclusive': 0.05,
  'urgent': 0.15,
  'immediately': 0.1,
  'act now': 0.2,
  'call now': 0.2,
  'order now': 0.15,
  'buy now': 0.15,
  'crypto': 0.1,
  'bitcoin': 0.1,
  'investment': 0.1,
  'earn money': 0.2,
  'make money': 0.2,
  'work from home': 0.15,
  'mlm': 0.3,
  'pills': 0.2,
  'viagra': 0.5,
  'enlargement': 0.5,
};

// Thresholds
const URL_THRESHOLD = 3; // Max URLs before considered spam
const CAPS_RATIO_THRESHOLD = 0.5; // Max ratio of uppercase letters

/**
 * Check content for spam
 */
export function checkSpam(
  content: string,
  existingContent?: string
): SpamCheckResult {
  const reasons: string[] = [];
  let confidence = 0;

  const lowerContent = content.toLowerCase();

  // Check for spam patterns
  for (const pattern of SPAM_PATTERNS) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      confidence += 0.1 * matches.length;
      reasons.push(`Pattern match: ${pattern.source.substring(0, 20)}...`);
    }
  }

  // Check for spam keywords
  for (const [keyword, weight] of Object.entries(SPAM_KEYWORDS)) {
    if (lowerContent.includes(keyword)) {
      confidence += weight;
      reasons.push(`Spam keyword: ${keyword}`);
    }
  }

  // Check URL count
  const urlMatches = content.match(/https?:\/\/[^\s]+/gi) || [];
  if (urlMatches.length > URL_THRESHOLD) {
    confidence += 0.3;
    reasons.push(`Excessive URLs (${urlMatches.length})`);
  }

  // Check caps ratio
  const letters = content.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 20) {
    const capsRatio = (letters.match(/[A-Z]/g) || []).length / letters.length;
    if (capsRatio > CAPS_RATIO_THRESHOLD) {
      confidence += 0.2;
      reasons.push(`Excessive caps (${Math.round(capsRatio * 100)}%)`);
    }
  }

  // Check for duplicate content
  if (existingContent && content.length > 50) {
    const similarity = calculateSimilarity(content, existingContent);
    if (similarity > 0.9) {
      confidence += 0.4;
      reasons.push(`Duplicate content (${Math.round(similarity * 100)}% similar)`);
    }
  }

  // Check for very short or very long content
  if (content.length < 10) {
    confidence += 0.1;
    reasons.push('Very short content');
  } else if (content.length > 10000) {
    confidence += 0.1;
    reasons.push('Very long content');
  }

  // Check for repetitive content
  const words = lowerContent.split(/\s+/);
  const uniqueWords = new Set(words);
  if (words.length > 20 && uniqueWords.size / words.length < 0.3) {
    confidence += 0.3;
    reasons.push('Repetitive content');
  }

  // Cap confidence at 1
  confidence = Math.min(1, confidence);

  return {
    isSpam: confidence > 0.5,
    confidence,
    reasons,
  };
}

/**
 * Calculate text similarity using Jaccard index
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Check if content looks like a bot
 */
export function checkBotPatterns(content: string, metadata?: {
  postingSpeed?: number; // Posts per minute
  accountAge?: number; // Days
  previousPosts?: number;
}): { isBot: boolean; confidence: number; reasons: string[] } {
  const reasons: string[] = [];
  let confidence = 0;

  // Check posting speed
  if (metadata?.postingSpeed && metadata.postingSpeed > 10) {
    confidence += 0.3;
    reasons.push(`High posting speed (${metadata.postingSpeed}/min)`);
  }

  // Check account age vs activity
  if (metadata?.accountAge !== undefined && metadata?.previousPosts !== undefined) {
    if (metadata.accountAge < 1 && metadata.previousPosts > 10) {
      confidence += 0.3;
      reasons.push('New account with high activity');
    }
  }

  // Check for bot-like patterns in content
  if (/^\[.*\]$/.test(content) || /^{.*}$/.test(content)) {
    confidence += 0.2;
    reasons.push('JSON-like content structure');
  }

  return {
    isBot: confidence > 0.5,
    confidence: Math.min(1, confidence),
    reasons,
  };
}

/**
 * Get spam score for a user based on history
 */
export async function getUserSpamScore(_userId: string): Promise<number> {
  // In production, this would query user's content history
  // and calculate a spam score based on past violations
  return 0;
}
