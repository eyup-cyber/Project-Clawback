/**
 * Accessibility Checker
 * Analyzes content for accessibility issues
 */

export interface A11yIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  wcag: string; // WCAG criterion reference
  element?: string;
  suggestion?: string;
}

export interface A11yAnalysisResult {
  score: number; // 0-100
  issues: A11yIssue[];
  summary: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
    total: number;
  };
  passed: string[];
}

export interface A11yInput {
  html: string;
  images?: Array<{ src: string; alt?: string; isDecorative?: boolean }>;
  links?: Array<{ href: string; text: string; opensInNewTab?: boolean }>;
  headings?: Array<{ level: number; text: string }>;
  forms?: Array<{
    inputs: Array<{
      type: string;
      label?: string;
      id?: string;
      required?: boolean;
    }>;
  }>;
  language?: string;
  pageTitle?: string;
}

/**
 * Check content for accessibility issues
 */
export function checkAccessibility(input: A11yInput): A11yAnalysisResult {
  const issues: A11yIssue[] = [];
  const passed: string[] = [];
  let score = 100;

  // Check images
  if (input.images) {
    const imageResults = checkImages(input.images);
    issues.push(...imageResults.issues);
    passed.push(...imageResults.passed);
    score -= imageResults.penalty;
  }

  // Check links
  if (input.links) {
    const linkResults = checkLinks(input.links);
    issues.push(...linkResults.issues);
    passed.push(...linkResults.passed);
    score -= linkResults.penalty;
  }

  // Check headings
  if (input.headings) {
    const headingResults = checkHeadings(input.headings);
    issues.push(...headingResults.issues);
    passed.push(...headingResults.passed);
    score -= headingResults.penalty;
  }

  // Check forms
  if (input.forms) {
    const formResults = checkForms(input.forms);
    issues.push(...formResults.issues);
    passed.push(...formResults.passed);
    score -= formResults.penalty;
  }

  // Check language
  if (input.language) {
    passed.push('Page has a language attribute');
  } else {
    issues.push({
      type: 'error',
      code: 'missing_language',
      message: 'Page is missing a language attribute',
      impact: 'serious',
      wcag: '3.1.1 Language of Page (Level A)',
      suggestion: 'Add lang attribute to the html element',
    });
    score -= 10;
  }

  // Check page title
  if (input.pageTitle && input.pageTitle.trim().length > 0) {
    passed.push('Page has a title');
  } else {
    issues.push({
      type: 'error',
      code: 'missing_title',
      message: 'Page is missing a title',
      impact: 'serious',
      wcag: '2.4.2 Page Titled (Level A)',
      suggestion: 'Add a descriptive title to the page',
    });
    score -= 10;
  }

  // Check HTML content
  const htmlResults = checkHtmlContent(input.html);
  issues.push(...htmlResults.issues);
  passed.push(...htmlResults.passed);
  score -= htmlResults.penalty;

  // Calculate summary
  const summary = {
    critical: issues.filter((i) => i.impact === 'critical').length,
    serious: issues.filter((i) => i.impact === 'serious').length,
    moderate: issues.filter((i) => i.impact === 'moderate').length,
    minor: issues.filter((i) => i.impact === 'minor').length,
    total: issues.length,
  };

  return {
    score: Math.max(0, Math.min(100, score)),
    issues: issues.sort((a, b) => {
      const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    }),
    summary,
    passed,
  };
}

function checkImages(images: A11yInput['images']): {
  issues: A11yIssue[];
  passed: string[];
  penalty: number;
} {
  const issues: A11yIssue[] = [];
  const passed: string[] = [];
  let penalty = 0;

  if (!images || images.length === 0) {
    return { issues, passed, penalty };
  }

  const missingAlt = images.filter((img) => !img.alt && !img.isDecorative);
  const emptyAlt = images.filter((img) => img.alt === '' && !img.isDecorative);
  const decorativeWithAlt = images.filter((img) => img.isDecorative && img.alt && img.alt !== '');

  if (missingAlt.length > 0) {
    issues.push({
      type: 'error',
      code: 'img_missing_alt',
      message: `${missingAlt.length} image(s) are missing alternative text`,
      impact: 'critical',
      wcag: '1.1.1 Non-text Content (Level A)',
      suggestion: 'Add descriptive alt text to all meaningful images',
    });
    penalty += missingAlt.length * 5;
  }

  if (emptyAlt.length > 0) {
    issues.push({
      type: 'warning',
      code: 'img_empty_alt',
      message: `${emptyAlt.length} image(s) have empty alt text but are not marked as decorative`,
      impact: 'moderate',
      wcag: '1.1.1 Non-text Content (Level A)',
      suggestion: 'Add alt text or mark as decorative with role="presentation"',
    });
    penalty += emptyAlt.length * 3;
  }

  if (decorativeWithAlt.length > 0) {
    issues.push({
      type: 'info',
      code: 'decorative_img_with_alt',
      message: `${decorativeWithAlt.length} decorative image(s) have alt text`,
      impact: 'minor',
      wcag: '1.1.1 Non-text Content (Level A)',
      suggestion: 'Use empty alt="" for decorative images',
    });
    penalty += decorativeWithAlt.length;
  }

  const properAlt = images.filter(
    (img) =>
      (img.alt && img.alt.length > 0 && !img.isDecorative) ||
      (img.isDecorative && (!img.alt || img.alt === ''))
  );

  if (properAlt.length > 0) {
    passed.push(`${properAlt.length} image(s) have proper alternative text`);
  }

  return { issues, passed, penalty };
}

function checkLinks(links: A11yInput['links']): {
  issues: A11yIssue[];
  passed: string[];
  penalty: number;
} {
  const issues: A11yIssue[] = [];
  const passed: string[] = [];
  let penalty = 0;

  if (!links || links.length === 0) {
    return { issues, passed, penalty };
  }

  // Check for empty link text
  const emptyLinks = links.filter((l) => !l.text || l.text.trim() === '');
  if (emptyLinks.length > 0) {
    issues.push({
      type: 'error',
      code: 'link_empty_text',
      message: `${emptyLinks.length} link(s) have no accessible text`,
      impact: 'critical',
      wcag: '2.4.4 Link Purpose (In Context) (Level A)',
      suggestion: 'Add descriptive text or aria-label to all links',
    });
    penalty += emptyLinks.length * 5;
  }

  // Check for generic link text
  const genericTexts = ['click here', 'here', 'read more', 'more', 'link', 'click'];
  const genericLinks = links.filter((l) => genericTexts.includes(l.text.toLowerCase().trim()));
  if (genericLinks.length > 0) {
    issues.push({
      type: 'warning',
      code: 'link_generic_text',
      message: `${genericLinks.length} link(s) use generic text like "click here"`,
      impact: 'moderate',
      wcag: '2.4.4 Link Purpose (In Context) (Level A)',
      suggestion: 'Use descriptive link text that indicates the destination',
    });
    penalty += genericLinks.length * 2;
  }

  // Check links that open in new tab without warning
  const newTabLinks = links.filter((l) => l.opensInNewTab);
  const newTabWithoutWarning = newTabLinks.filter(
    (l) => !l.text.toLowerCase().includes('new tab') && !l.text.toLowerCase().includes('new window')
  );
  if (newTabWithoutWarning.length > 0) {
    issues.push({
      type: 'info',
      code: 'link_new_tab_warning',
      message: `${newTabWithoutWarning.length} link(s) open in new tab without indication`,
      impact: 'minor',
      wcag: '3.2.5 Change on Request (Level AAA)',
      suggestion: 'Indicate when links open in a new tab/window',
    });
    penalty += newTabWithoutWarning.length;
  }

  const descriptiveLinks = links.length - emptyLinks.length - genericLinks.length;
  if (descriptiveLinks > 0) {
    passed.push(`${descriptiveLinks} link(s) have descriptive text`);
  }

  return { issues, passed, penalty };
}

function checkHeadings(headings: A11yInput['headings']): {
  issues: A11yIssue[];
  passed: string[];
  penalty: number;
} {
  const issues: A11yIssue[] = [];
  const passed: string[] = [];
  let penalty = 0;

  if (!headings || headings.length === 0) {
    issues.push({
      type: 'warning',
      code: 'no_headings',
      message: 'Page has no headings',
      impact: 'moderate',
      wcag: '1.3.1 Info and Relationships (Level A)',
      suggestion: 'Use headings to structure content hierarchically',
    });
    penalty += 10;
    return { issues, passed, penalty };
  }

  // Check for skipped heading levels
  const levels = headings.map((h) => h.level).sort((a, b) => a - b);
  let previousLevel = 0;
  const skippedLevels: number[] = [];

  for (const level of levels) {
    if (level > previousLevel + 1 && previousLevel !== 0) {
      skippedLevels.push(level);
    }
    previousLevel = level;
  }

  if (skippedLevels.length > 0) {
    issues.push({
      type: 'warning',
      code: 'heading_skipped_level',
      message: 'Heading levels are skipped (e.g., h1 to h3)',
      impact: 'moderate',
      wcag: '1.3.1 Info and Relationships (Level A)',
      suggestion: 'Use heading levels in sequential order without skipping',
    });
    penalty += 5;
  }

  // Check for empty headings
  const emptyHeadings = headings.filter((h) => !h.text || h.text.trim() === '');
  if (emptyHeadings.length > 0) {
    issues.push({
      type: 'error',
      code: 'heading_empty',
      message: `${emptyHeadings.length} heading(s) are empty`,
      impact: 'serious',
      wcag: '1.3.1 Info and Relationships (Level A)',
      suggestion: 'All headings must have text content',
    });
    penalty += emptyHeadings.length * 3;
  }

  // Check if there's an h1
  const hasH1 = headings.some((h) => h.level === 1);
  if (!hasH1) {
    issues.push({
      type: 'warning',
      code: 'no_h1',
      message: 'Page has no h1 heading',
      impact: 'moderate',
      wcag: '1.3.1 Info and Relationships (Level A)',
      suggestion: 'Add a main h1 heading to the page',
    });
    penalty += 5;
  } else {
    passed.push('Page has an h1 heading');
  }

  // Check for multiple h1s
  const h1Count = headings.filter((h) => h.level === 1).length;
  if (h1Count > 1) {
    issues.push({
      type: 'info',
      code: 'multiple_h1',
      message: `Page has ${h1Count} h1 headings`,
      impact: 'minor',
      wcag: '1.3.1 Info and Relationships (Level A)',
      suggestion: 'Consider using only one h1 per page',
    });
    penalty += 2;
  }

  if (skippedLevels.length === 0 && emptyHeadings.length === 0) {
    passed.push('Heading structure is properly ordered');
  }

  return { issues, passed, penalty };
}

function checkForms(forms: A11yInput['forms']): {
  issues: A11yIssue[];
  passed: string[];
  penalty: number;
} {
  const issues: A11yIssue[] = [];
  const passed: string[] = [];
  let penalty = 0;

  if (!forms || forms.length === 0) {
    return { issues, passed, penalty };
  }

  for (const form of forms) {
    const unlabeledInputs = form.inputs.filter(
      (i) => !i.label && i.type !== 'hidden' && i.type !== 'submit' && i.type !== 'button'
    );

    if (unlabeledInputs.length > 0) {
      issues.push({
        type: 'error',
        code: 'input_missing_label',
        message: `${unlabeledInputs.length} form input(s) are missing labels`,
        impact: 'critical',
        wcag: '1.3.1 Info and Relationships (Level A)',
        suggestion: 'Associate labels with all form inputs using for/id or aria-label',
      });
      penalty += unlabeledInputs.length * 5;
    }

    const inputsWithoutId = form.inputs.filter((i) => !i.id && i.type !== 'hidden');
    if (inputsWithoutId.length > 0) {
      issues.push({
        type: 'warning',
        code: 'input_missing_id',
        message: `${inputsWithoutId.length} form input(s) are missing id attribute`,
        impact: 'moderate',
        wcag: '1.3.1 Info and Relationships (Level A)',
        suggestion: 'Add unique id attributes to form inputs for proper label association',
      });
      penalty += inputsWithoutId.length * 2;
    }

    const labeledInputs = form.inputs.filter((i) => i.label);
    if (labeledInputs.length > 0) {
      passed.push(`${labeledInputs.length} form input(s) have proper labels`);
    }
  }

  return { issues, passed, penalty };
}

function checkHtmlContent(html: string): {
  issues: A11yIssue[];
  passed: string[];
  penalty: number;
} {
  const issues: A11yIssue[] = [];
  const passed: string[] = [];
  let penalty = 0;

  // Check for inline styles affecting visibility
  if (html.includes('display: none') || html.includes('display:none')) {
    issues.push({
      type: 'info',
      code: 'hidden_content',
      message: 'Content hidden with display:none may not be accessible',
      impact: 'minor',
      wcag: '1.3.2 Meaningful Sequence (Level A)',
      suggestion: 'Consider using visually-hidden class for screen reader content',
    });
    penalty += 1;
  }

  // Check for tabindex > 0
  const tabindexMatch = html.match(/tabindex\s*=\s*["']?(\d+)/gi);
  if (tabindexMatch) {
    const hasPositiveTabindex = tabindexMatch.some((m) => {
      const num = parseInt(m.match(/\d+/)?.[0] || '0', 10);
      return num > 0;
    });
    if (hasPositiveTabindex) {
      issues.push({
        type: 'warning',
        code: 'positive_tabindex',
        message: 'Positive tabindex values can disrupt natural tab order',
        impact: 'moderate',
        wcag: '2.4.3 Focus Order (Level A)',
        suggestion: 'Use tabindex="0" or "-1" instead of positive values',
      });
      penalty += 5;
    }
  }

  // Check for autofocus
  if (html.includes('autofocus')) {
    issues.push({
      type: 'info',
      code: 'autofocus_used',
      message: 'Autofocus can be disorienting for screen reader users',
      impact: 'minor',
      wcag: '3.2.1 On Focus (Level A)',
      suggestion: 'Consider if autofocus is necessary',
    });
    penalty += 1;
  }

  // Check for ARIA roles
  if (html.includes('role=')) {
    passed.push('ARIA roles are used');
  }

  // Check for accessible buttons
  if (html.includes('<button') || html.includes('role="button"')) {
    passed.push('Interactive elements use semantic markup or ARIA');
  }

  return { issues, passed, penalty };
}

/**
 * Get WCAG compliance level based on issues
 */
export function getComplianceLevel(issues: A11yIssue[]): 'A' | 'AA' | 'AAA' | 'None' {
  const criticalOrSerious = issues.filter((i) => i.impact === 'critical' || i.impact === 'serious');

  if (criticalOrSerious.length > 0) {
    return 'None';
  }

  const moderate = issues.filter((i) => i.impact === 'moderate');
  if (moderate.length > 3) {
    return 'A';
  }

  const minor = issues.filter((i) => i.impact === 'minor');
  if (minor.length > 5) {
    return 'AA';
  }

  return 'AAA';
}
