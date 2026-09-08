module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-hooks', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  settings: {
    'import/resolver': { typescript: { project: './tsconfig.json' } },
  },
  rules: {
    'import/no-restricted-paths': ['error', {
      zones: [
        { target: './src/components/atoms', from: './src/components', except: ['./atoms'] },
        { target: './src/components/molecules', from: './src/components', except: ['./atoms', './molecules'] },
        { target: './src/components/organisms', from: './src/components', except: ['./atoms', './molecules', './organisms'] },
        { target: './src/components/templates', from: './src/components', except: ['./atoms', './molecules', './organisms', './templates'] },
        { target: './src/components/pages', from: './src/components', except: ['./atoms', './molecules', './organisms', './templates', './pages'] },
      ],
    }],
  },
  ignorePatterns: ['dist', 'coverage', 'vite.config.ts', '.eslintrc.cjs'],
};
