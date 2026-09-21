// @ts-check
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/**', 'android/**', 'node_modules/**', 'public/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // The whole point of the module structure: no file grows into a monolith.
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Capacitor plugins are only touched inside src/core/platform (and the native db driver).
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/core/platform/**', 'src/core/db/driver.native.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@capacitor/*', '@capacitor-community/*', '@aparajita/*'],
              message: 'Use the adapters in src/core/platform instead of importing Capacitor plugins directly.',
            },
          ],
        },
      ],
    },
  },
)
