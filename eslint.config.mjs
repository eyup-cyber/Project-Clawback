import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const projectRoot = new URL('.', import.meta.url).pathname;
const commonIgnores = [
  '.next/**',
  'out/**',
  'build/**',
  'dist/**',
  'coverage/**',
  'node_modules/**',
  '.vercel/**',
  'public/**',
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: commonIgnores,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: projectRoot,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      // Allow <img> for user-uploaded media from R2/Supabase (dynamic URLs)
      '@next/next/no-img-element': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'import/no-anonymous-default-export': 'off',
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
    },
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    ignores: commonIgnores,
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
    },
  },
  // Allow console.log in worker files, scripts, and integrations where logging is expected
  {
    files: [
      'lib/jobs/workers/**/*.ts',
      'lib/jobs/queue.ts',
      'lib/integrations/**/*.ts',
      'lib/cache/**/*.ts',
      'lib/search/**/*.ts',
      'scripts/**/*.js',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  globalIgnores([...commonIgnores, 'next-env.d.ts']),
]);

export default eslintConfig;
