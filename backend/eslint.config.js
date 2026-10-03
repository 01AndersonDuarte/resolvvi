import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['coverage/**', 'dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
      eqeqeq: ['error', 'always'],
      'max-lines': ['error', { max: 100, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 30, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 3],
      'no-console': 'error',
    },
  },
  {
    files: ['src/config/logger.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
