import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'work/**', 'public/sw.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['src/**/*.{ts,tsx}'], plugins: { 'react-hooks': reactHooks }, rules: { ...reactHooks.configs['recommended-latest'].rules, '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
  { files: ['tests/**/*.ts'], rules: { '@typescript-eslint/no-explicit-any': 'off' } },
);
