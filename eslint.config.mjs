import tseslint from 'typescript-eslint'
import nextPlugin from '@next/eslint-plugin-next'
import tsParser from '@typescript-eslint/parser'

export default tseslint.config(
  { ignores: ['.next/', 'node_modules/', 'drizzle/', '*.config.*', 'next-env.d.ts', 'neon.ts'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@next/next': nextPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs.recommendedTypeChecked.rules,
      ...nextPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/await-thenable': 'warn',
    },
  }
)