/**
 * Profanity Filter
 * Detects and filters inappropriate language
 */

// Basic profanity word list (in production, use a more comprehensive list)
// Type annotation required for empty Set to avoid TypeScript inferring Set<never>
const PROFANITY_LIST: Set<string> = new Set([
  // Add actual profanity words in production
  // This is a placeholder implementation
]);

// Words that look like profanity but aren't
const FALSE_POSITIVES = new Set([
  'assessment',
  'class',
  'classic',
  'assume',
  'bass',
  'pass',
  'grass',
  'mass',
]);

// Leet speak substitutions
const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  $: 's',
};

export interface ProfanityResult {
  hasProfanity: boolean;
  flaggedWords: string[];
  severity: number; // 0-1 scale
  cleanedText: string;
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  let normalized = text.toLowerCase();

  // Replace leet speak
  for (const [leet, char] of Object.entries(LEET_MAP)) {
    normalized = normalized.replace(
      new RegExp(leet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      char
    );
  }

  // Remove repeated characters (e.g., "fuuuck" -> "fuck")
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');

  // Remove spaces between characters (e.g., "f u c k" -> "fuck")
  normalized = normalized.replace(/\s+/g, ' ');

  return normalized;
}

/**
 * Check if a word is profanity
 */
function isProfanity(word: string): boolean {
  const normalized = normalizeText(word);

  // Check false positives first
  if (FALSE_POSITIVES.has(normalized)) {
    return false;
  }

  // Check against profanity list
  if (PROFANITY_LIST.has(normalized)) {
    return true;
  }

  // Check for partial matches (words containing profanity)
  for (const profanity of PROFANITY_LIST) {
    if (normalized.includes(profanity) && !FALSE_POSITIVES.has(normalized)) {
      return true;
    }
  }

  return false;
}

/**
 * Check text for profanity
 */
export function checkProfanity(text: string): ProfanityResult {
  const words = text.split(/\s+/);
  const flaggedWords: string[] = [];
  const cleanedWords: string[] = [];

  for (const word of words) {
    if (isProfanity(word)) {
      flaggedWords.push(word);
      // Replace with asterisks
      cleanedWords.push('*'.repeat(word.length));
    } else {
      cleanedWords.push(word);
    }
  }

  // Calculate severity based on percentage of flagged words
  const severity = words.length > 0 ? flaggedWords.length / words.length : 0;

  return {
    hasProfanity: flaggedWords.length > 0,
    flaggedWords,
    severity: Math.min(1, severity * 2), // Scale up for emphasis
    cleanedText: cleanedWords.join(' '),
  };
}

/**
 * Clean text by replacing profanity with asterisks
 */
export function cleanProfanity(text: string): string {
  return checkProfanity(text).cleanedText;
}

/**
 * Get severity level as string
 */
export function getSeverityLevel(severity: number): 'none' | 'low' | 'medium' | 'high' {
  if (severity === 0) return 'none';
  if (severity < 0.3) return 'low';
  if (severity < 0.6) return 'medium';
  return 'high';
}

/**
 * Check if text is safe to display
 */
export function isSafeText(text: string): boolean {
  return !checkProfanity(text).hasProfanity;
}

/**
 * Add words to the profanity list (for admin use)
 */
export function addToProfanityList(words: string[]): void {
  for (const word of words) {
    PROFANITY_LIST.add(word.toLowerCase());
  }
}

/**
 * Add words to false positives list (for admin use)
 */
export function addToFalsePositives(words: string[]): void {
  for (const word of words) {
    FALSE_POSITIVES.add(word.toLowerCase());
  }
}
