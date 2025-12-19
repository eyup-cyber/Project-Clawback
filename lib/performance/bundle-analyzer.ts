/**
 * Bundle Analysis Utilities
 * Track and monitor bundle sizes and performance
 */

import fs from 'fs';
import path from 'path';

export interface BundleStats {
  name: string;
  size: number;
  gzipSize?: number;
  chunks: string[];
  assets: AssetStats[];
}

export interface AssetStats {
  name: string;
  size: number;
  gzipSize?: number;
  type: 'js' | 'css' | 'image' | 'font' | 'other';
}

export interface BundleReport {
  timestamp: string;
  totalSize: number;
  totalGzipSize: number;
  bundles: BundleStats[];
  warnings: string[];
  recommendations: string[];
}

// Size thresholds in bytes
const SIZE_THRESHOLDS: Record<string, { warning: number; error: number }> = {
  js: {
    warning: 250 * 1024, // 250KB
    error: 500 * 1024, // 500KB
  },
  css: {
    warning: 50 * 1024, // 50KB
    error: 150 * 1024, // 150KB
  },
  image: {
    warning: 200 * 1024, // 200KB
    error: 1024 * 1024, // 1MB
  },
  font: {
    warning: 100 * 1024, // 100KB
    error: 500 * 1024, // 500KB
  },
  other: {
    warning: 100 * 1024, // 100KB
    error: 500 * 1024, // 500KB
  },
  total: {
    warning: 1024 * 1024, // 1MB
    error: 3 * 1024 * 1024, // 3MB
  },
};

/**
 * Get asset type from filename
 */
function getAssetType(filename: string): AssetStats['type'] {
  const ext = path.extname(filename).toLowerCase();
  if (['.js', '.mjs', '.cjs'].includes(ext)) return 'js';
  if (['.css', '.scss', '.sass'].includes(ext)) return 'css';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'].includes(ext)) return 'image';
  if (['.woff', '.woff2', '.ttf', '.eot', '.otf'].includes(ext)) return 'font';
  return 'other';
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Analyze Next.js build output
 */
export async function analyzeBuildOutput(buildDir: string = '.next'): Promise<BundleReport> {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  const bundles: BundleStats[] = [];

  const staticDir = path.join(buildDir, 'static');
  
  if (!fs.existsSync(staticDir)) {
    return {
      timestamp: new Date().toISOString(),
      totalSize: 0,
      totalGzipSize: 0,
      bundles: [],
      warnings: ['Build directory not found. Run `npm run build` first.'],
      recommendations: [],
    };
  }

  // Analyze chunks directory
  const chunksDir = path.join(staticDir, 'chunks');
  if (fs.existsSync(chunksDir)) {
    const chunkFiles = fs.readdirSync(chunksDir, { recursive: true }) as string[];
    const assets: AssetStats[] = [];

    for (const file of chunkFiles) {
      const filePath = path.join(chunksDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        const asset: AssetStats = {
          name: file,
          size: stat.size,
          type: getAssetType(file),
        };
        assets.push(asset);

        // Check thresholds
        const threshold = SIZE_THRESHOLDS[asset.type];
        if (threshold) {
          if (asset.size > threshold.error) {
            warnings.push(`${file} (${formatBytes(asset.size)}) exceeds error threshold`);
          } else if (asset.size > threshold.warning) {
            warnings.push(`${file} (${formatBytes(asset.size)}) exceeds warning threshold`);
          }
        }
      }
    }

    bundles.push({
      name: 'chunks',
      size: assets.reduce((sum, a) => sum + a.size, 0),
      chunks: assets.filter(a => a.type === 'js').map(a => a.name),
      assets,
    });
  }

  // Analyze CSS
  const cssDir = path.join(staticDir, 'css');
  if (fs.existsSync(cssDir)) {
    const cssFiles = fs.readdirSync(cssDir);
    const assets: AssetStats[] = cssFiles.map((file) => {
      const stat = fs.statSync(path.join(cssDir, file));
      return {
        name: file,
        size: stat.size,
        type: 'css' as const,
      };
    });

    bundles.push({
      name: 'css',
      size: assets.reduce((sum, a) => sum + a.size, 0),
      chunks: [],
      assets,
    });

    const totalCss = assets.reduce((sum, a) => sum + a.size, 0);
    if (totalCss > SIZE_THRESHOLDS.css.error) {
      warnings.push(`Total CSS (${formatBytes(totalCss)}) exceeds threshold`);
      recommendations.push('Consider splitting CSS with CSS modules or dynamic imports');
    }
  }

  const totalSize = bundles.reduce((sum, b) => sum + b.size, 0);

  // Check total size
  if (totalSize > SIZE_THRESHOLDS.total.error) {
    warnings.push(`Total bundle size (${formatBytes(totalSize)}) exceeds threshold`);
    recommendations.push(
      'Consider code splitting with dynamic imports',
      'Review and remove unused dependencies',
      'Enable tree shaking for large libraries'
    );
  }

  // Add general recommendations
  if (bundles.some(b => b.assets.some(a => a.type === 'js' && a.size > 100 * 1024))) {
    recommendations.push('Large JavaScript chunks detected - consider route-based code splitting');
  }

  return {
    timestamp: new Date().toISOString(),
    totalSize,
    totalGzipSize: Math.round(totalSize * 0.3), // Rough estimate
    bundles,
    warnings,
    recommendations,
  };
}

/**
 * Track bundle sizes over time
 */
export async function trackBundleSize(
  buildDir: string = '.next',
  historyFile: string = '.bundle-history.json'
): Promise<{
  current: BundleReport;
  previous?: BundleReport;
  diff?: {
    totalSizeDiff: number;
    percentChange: number;
  };
}> {
  const current = await analyzeBuildOutput(buildDir);

  // Load previous history
  let previous: BundleReport | undefined;
  if (fs.existsSync(historyFile)) {
    try {
      const history = JSON.parse(fs.readFileSync(historyFile, 'utf-8')) as BundleReport[];
      previous = history[history.length - 1];
    } catch {
      // Ignore parse errors
    }
  }

  // Calculate diff
  let diff: { totalSizeDiff: number; percentChange: number } | undefined;
  if (previous) {
    const totalSizeDiff = current.totalSize - previous.totalSize;
    const percentChange = previous.totalSize > 0 
      ? (totalSizeDiff / previous.totalSize) * 100 
      : 0;
    diff = { totalSizeDiff, percentChange };
  }

  // Save to history
  const history: BundleReport[] = previous 
    ? [previous, current].slice(-10) // Keep last 10 entries
    : [current];
  
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

  return { current, previous, diff };
}

/**
 * Performance budget checker
 */
export interface PerformanceBudget {
  js: number;
  css: number;
  images: number;
  total: number;
}

export function checkPerformanceBudget(
  report: BundleReport,
  budget: PerformanceBudget
): {
  passed: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  const jsSize = report.bundles
    .flatMap(b => b.assets)
    .filter(a => a.type === 'js')
    .reduce((sum, a) => sum + a.size, 0);

  const cssSize = report.bundles
    .flatMap(b => b.assets)
    .filter(a => a.type === 'css')
    .reduce((sum, a) => sum + a.size, 0);

  const imageSize = report.bundles
    .flatMap(b => b.assets)
    .filter(a => a.type === 'image')
    .reduce((sum, a) => sum + a.size, 0);

  if (jsSize > budget.js) {
    violations.push(`JavaScript (${formatBytes(jsSize)}) exceeds budget (${formatBytes(budget.js)})`);
  }

  if (cssSize > budget.css) {
    violations.push(`CSS (${formatBytes(cssSize)}) exceeds budget (${formatBytes(budget.css)})`);
  }

  if (imageSize > budget.images) {
    violations.push(`Images (${formatBytes(imageSize)}) exceeds budget (${formatBytes(budget.images)})`);
  }

  if (report.totalSize > budget.total) {
    violations.push(`Total (${formatBytes(report.totalSize)}) exceeds budget (${formatBytes(budget.total)})`);
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Generate bundle report markdown
 */
export function generateReportMarkdown(report: BundleReport): string {
  const lines = [
    '# Bundle Analysis Report',
    '',
    `Generated: ${report.timestamp}`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `| ------ | ----- |`,
    `| Total Size | ${formatBytes(report.totalSize)} |`,
    `| Estimated Gzip | ${formatBytes(report.totalGzipSize)} |`,
    `| Bundles | ${report.bundles.length} |`,
    '',
  ];

  if (report.warnings.length > 0) {
    lines.push('## ⚠️ Warnings', '');
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push('');
  }

  if (report.recommendations.length > 0) {
    lines.push('## 💡 Recommendations', '');
    for (const rec of report.recommendations) {
      lines.push(`- ${rec}`);
    }
    lines.push('');
  }

  lines.push('## Bundle Details', '');
  for (const bundle of report.bundles) {
    lines.push(`### ${bundle.name}`, '');
    lines.push(`Size: ${formatBytes(bundle.size)}`, '');
    
    if (bundle.assets.length > 0) {
      lines.push('| Asset | Size | Type |');
      lines.push('| ----- | ---- | ---- |');
      for (const asset of bundle.assets.slice(0, 20)) {
        lines.push(`| ${asset.name} | ${formatBytes(asset.size)} | ${asset.type} |`);
      }
      if (bundle.assets.length > 20) {
        lines.push(`| ... and ${bundle.assets.length - 20} more | | |`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
