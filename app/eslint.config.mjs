import js from '@eslint/js'
import globals from 'globals'
import jsdoc from 'eslint-plugin-jsdoc'
import typescript from '@typescript-eslint/parser'
import typescriptPlugin from '@typescript-eslint/eslint-plugin'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import importPlugin from 'eslint-plugin-import'
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
import jestPlugin from 'eslint-plugin-jest'
import sonarjsPlugin from 'eslint-plugin-sonarjs'
import unicornPlugin from 'eslint-plugin-unicorn'
import nextPlugin from '@next/eslint-plugin-next'
import testingLibraryPlugin from 'eslint-plugin-testing-library'
import securityPlugin from 'eslint-plugin-security'
import perfectionistPlugin from 'eslint-plugin-perfectionist'
import promisePlugin from 'eslint-plugin-promise'
import regexpPlugin from 'eslint-plugin-regexp'
import prettierPlugin from 'eslint-plugin-prettier'
import unusedImportsPlugin from 'eslint-plugin-unused-imports'
import boundariesPlugin from 'eslint-plugin-boundaries'
import noRelativeImportPathsPlugin from 'eslint-plugin-no-relative-import-paths'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
      },
      parser: typescript,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
          alwaysTryTypes: true, // Включаем автоматическое разрешение типов для внешних пакетов, например для @types/yandex-maps
        },
      },
      react: {
        version: 'detect', // Автоматически определяем версию React для корректной работы правил
      },
      'boundaries/ignore': ['pages/*'],
      'boundaries/elements': [
        {
          type: 'app',
          pattern: 'src/(app|App|main)',
        },
        {
          type: 'pageIndex',
          pattern: 'src/pages/*/index.ts{,x}',
          mode: 'file',
        },
        {
          type: 'pages',
          pattern: 'src/pages',
        },
        {
          type: 'widgetIndex',
          pattern: 'src/widgets/*/index.ts{,x}',
          mode: 'file',
        },
        {
          type: 'widgets',
          pattern: 'src/widgets/*',
        },
        {
          type: 'sharedUiIndex',
          pattern: 'src/shared/ui/*/index.ts{,x}',
          mode: 'file',
        },
        {
          type: 'sharedUi',
          pattern: 'src/shared/ui/*',
        },
        {
          type: 'shared',
          pattern: 'src/shared/*',
        },
      ],
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      import: importPlugin,
      'jsx-a11y': jsxA11yPlugin,
      jest: jestPlugin,
      sonarjs: sonarjsPlugin,
      unicorn: unicornPlugin,
      jsdoc: jsdoc,
      next: nextPlugin,
      'testing-library': testingLibraryPlugin,
      security: securityPlugin,
      perfectionist: perfectionistPlugin,
      promise: promisePlugin,
      regexp: regexpPlugin,
      prettier: prettierPlugin,
      'unused-imports': unusedImportsPlugin,
      boundaries: boundariesPlugin,
      'no-relative-import-paths': noRelativeImportPathsPlugin,
    },
    rules: {
      // Prettier
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          semi: false,
          trailingComma: 'all',
          printWidth: 100,
          tabWidth: 2,
        },
      ],

      // Unused Imports
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // Boundaries
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          rules: [
            {
              from: 'app',
              disallow: ['pages', 'widgets', 'sharedUi'],
              message: 'Нельзя импортировать напрямую, нужно через publicApi (index)',
            },
            {
              from: 'pages',
              disallow: ['app'],
              message: 'Нельзя в pages использовать app',
            },
            {
              from: 'pages',
              disallow: ['pages', 'pageIndex'],
              message: 'Нельзя в одной странице использовать части другой',
            },
            {
              from: 'pages',
              disallow: ['widgets'],
              message: 'Можно использовать widgets только через publicApi (index)',
            },
            {
              from: 'pages',
              disallow: ['sharedUi'],
              message: 'shared/ui можно использовать только через publicApi (index)',
            },
            {
              from: 'widgets',
              disallow: ['app', 'pages', 'pageIndex'],
              message: 'Нельзя использовать app и pages из widgets',
            },
            {
              from: 'widgets',
              disallow: ['widgets', 'widgetIndex'],
              message:
                'Виджеты независимы, можно вынести общие части в shared, либо собрать композицию на уровне page',
            },
            {
              from: 'widgets',
              disallow: ['sharedUi'],
              message: 'shared/ui можно использовать только через publicApi (index)',
            },
            {
              from: ['shared', 'sharedUi', 'sharedUiIndex'],
              disallow: ['app', 'pages', 'pageIndex', 'widgets', 'widgetIndex'],
              message: 'Из shared нельзя использовать вышестоящие слои',
            },
            {
              from: ['shared', 'sharedUi'],
              disallow: ['sharedUi'],
              message:
                'В shared/ui находятся независимые компоненты, их можно использовать только через publicApi (index)',
            },
          ],
        },
      ],

      // No Relative Import Paths
      // осмыслить
      'no-relative-import-paths/no-relative-import-paths': 'off',
      // 'no-relative-import-paths/no-relative-import-paths': [
      //   'error',
      //   { allowSameFolder: true, rootDir: 'src', prefix: '@' },
      // ],

      // Правила TypeScript
      '@typescript-eslint/no-explicit-any': 'warn', // Предупреждаем об использовании any, так как это снижает типобезопасность
      '@typescript-eslint/explicit-function-return-type': 'off', // Не требуем явного указания возвращаемого типа для функций
      '@typescript-eslint/explicit-module-boundary-types': 'off', // Не требуем явного указания типов для экспортируемых функций
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }], // Запрещаем неиспользуемые переменные, кроме тех, что начинаются с _
      '@typescript-eslint/no-non-null-assertion': 'off', // Предупреждаем об использовании оператора !, так как это может привести к ошибкам
      '@typescript-eslint/ban-ts-comment': 'off', // Разрешаем использование ts-ignore и других комментариев TypeScript
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }], // Требуем явного указания, что импортируем именно тип
      '@typescript-eslint/return-await': 'off', // Отключаем из-за проблем с производительностью и стабильностью
      '@typescript-eslint/naming-convention': [
        'error',
        {
          format: ['PascalCase'],
          prefix: ['I'],
          selector: 'interface',
          filter: {
            regex: 'Window|ProcessEnv',
            match: false,
          },
        },
        {
          format: ['PascalCase'],
          prefix: ['T'],
          selector: 'typeAlias',
        },
        {
          format: ['PascalCase'],
          selector: 'typeLike',
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
          prefix: ['E'],
        },
      ], // Правила именования для интерфейсов и типов
      '@typescript-eslint/strict-boolean-expressions': 'off', // пока отключил, но стоит посмотреть повнимательнее
      '@typescript-eslint/no-floating-promises': 'off',

      // Правила React
      'react/react-in-jsx-scope': 'off', // Отключаем для React 17+, так как импорт React больше не требуется
      'react/prop-types': 'off', // Отключаем, так как используем TypeScript для проверки типов
      'react/jsx-uses-react': 'off',
      'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }], // Разрешаем JSX только в .tsx файлах
      'react/display-name': 'off', // Отключаем требование displayName для memo компонентов
      'react/jsx-props-no-spreading': ['error', { exceptions: ['Component'] }], // Запрещаем spread оператор для пропсов, кроме компонентов
      'react/jsx-sort-props': ['error', { callbacksLast: true, shorthandFirst: true }], // Сортируем пропсы по алфавиту, колбэки в конце
      'react/require-default-props': 'off', // Отключаем, так как используем TypeScript для проверки обязательных пропсов
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'function-expression',
        },
      ], // Используем стрелочные функции для именованных компонентов
      'react/jsx-key': 'error', // хотим не продалбывать key в циклах

      // Правила React Hooks
      'react-hooks/rules-of-hooks': 'error', // Строго следим за правилами использования хуков
      'react-hooks/exhaustive-deps': 'warn', // Предупреждаем о неполных зависимостях в useEffect

      // Правила импортов
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always', // Разделяем группы импортов пустыми строками
          alphabetize: { order: 'asc' }, // Сортируем импорты по алфавиту
        },
      ],
      'import/exports-last': 'off', // Не требуем экспорты в конце файла
      'import/extensions': 'off', // Отключаем требование расширений файлов
      'import/imports-first': 'warn', // Требуем импорты в начале файла
      'import/no-cycle': 'error', // Запрещаем циклические зависимости
      'import/no-duplicates': 'error', // Отключаем проверку дубликатов импортов
      'import/prefer-default-export': 'off', // Не требуем default экспорты
      'import/newline-after-import': 'warn', // Требуем пустую строку после импортов
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/__tests__/*.{ts,tsx}',
            '**/{__mocks__,mocks}/*.{ts,js}',
            '**/jest.*{js,jsx,ts,tsx}',
            '**/*.spec.{ts,tsx}',
          ],
        },
      ], // Запрещаем импорт dev-зависимостей в production код

      // Правила Jest
      'jest/no-mocks-import': 'off', // Отключаем проверку импортов моков

      // Общие правила
      'no-console': ['warn', { allow: ['warn', 'error'] }], // Запрещаем console.log, но разрешаем console.warn и console.error
      'no-debugger': 'warn', // Предупреждаем об использовании debugger
      'no-unused-vars': 'off', // Отключаем в пользу @typescript-eslint/no-unused-vars
      'no-duplicate-imports': 'warn', // Предупреждаем о дубликатах импортов
      'no-param-reassign': [
        'error',
        { props: true, ignorePropertyModificationsFor: ['draft', 'acc'] },
      ], // Запрещаем мутацию параметров, кроме draft в immer и acc в reduce
      'arrow-body-style': ['error', 'as-needed'], // Требуем краткую запись стрелочных функций
      semi: ['error', 'never'], // Запрещаем точку с запятой
      'no-extra-semi': 'off',
      'max-lines': ['error', 300], // Ограничиваем размер файлов 300 строками

      // Правила SonarJS
      'sonarjs/no-duplicate-string': 'off', // Отключаем проверку дубликатов строк

      // Правила Unicorn
      'unicorn/no-empty-file': 'warn', // Предупреждаем о пустых файлах
      'unicorn/consistent-destructuring': 'off', // Не требуем деструктуризацию везде
      'unicorn/expiring-todo-comments': 'off', // Отключаем проверку срока действия TODO комментариев
      'unicorn/filename-case': 'off', // Не требуем определенный регистр в именах файлов
      'unicorn/no-array-for-each': 'off', // Разрешаем использовать forEach вместо for...of
      'unicorn/no-document-cookie': 'off', // Разрешаем использовать document.cookie
      'unicorn/prefer-dom-node-text-content': 'off', // Разрешаем использовать innerText вместо textContent
      'unicorn/prefer-set-has': 'off', // Не требуем использовать Set.has вместо includes
      'unicorn/no-array-reduce': 'off', // Разрешаем использовать reduce
      'unicorn/no-nested-ternary': 'off', // Разрешаем вложенные тернарные операторы
      'unicorn/no-null': 'off', // Разрешаем использовать null
      'unicorn/number-literal-case': 'off', // Отключаем проверку регистра в числовых литералах
      'unicorn/explicit-length-check': 'off', // Не требуем явную проверку длины
      'unicorn/consistent-function-scoping': 'off', // Не требуем выносить функции из scope компонента
      'unicorn/prefer-node-protocol': 'off', // Не требуем использовать node: протокол
      'unicorn/prefer-object-from-entries': 'off', // Не требуем использовать Object.fromEntries
      'unicorn/prevent-abbreviations': 'off', // Разрешаем использовать сокращения
      'unicorn/switch-case-braces': 'off', // Не требуем фигурные скобки в case
      'react/jsx-curly-brace-presence': ['error', { props: 'never' }],
      'unicorn/text-encoding-identifier-case': 'off', // Отключаем проверку регистра в encoding
      '@typescript-eslint/no-require-imports': 'error',

      // Next.js recommended rules
      'next/no-html-link-for-pages': 'error',
      'next/no-head-element': 'error',
      'next/no-sync-scripts': 'error',
      'next/no-title-in-document-head': 'error',
      'next/no-duplicate-head': 'error',
      'next/no-unwanted-polyfillio': 'error',
      'next/no-img-element': 'warn',
      'next/no-page-custom-font': 'error',
      'next/no-css-tags': 'error',
      'next/no-document-import-in-page': 'error',
      'next/no-typos': 'error',
      'next/no-styled-jsx-in-document': 'error',
      'next/next-script-for-ga': 'warn',
      'next/no-before-interactive-script-outside-document': 'error',
      'next/no-head-import-in-document': 'error',
      'next/no-assign-module-variable': 'error',
    },
  },
  {
    ignores: ['.next', 'coverage', 'build', 'node_modules', 'out', 'public', '*.d.ts'],
  },
  // === overrides for api and types ===
  {
    files: ['**/*'],
    ignores: ['src/types/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/types/*', '!@/types/index', '!@/types/enums'],
              message: 'Import of private types is not allowed.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*'],
    ignores: ['src/api/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/api/*', '!@/api/index'],
              message: 'Import of internal api variables is not allowed.',
            },
          ],
        },
      ],
    },
  },
  // === Node.js config files (глобалы Node) ===
  {
    files: [
      '*.config.js',
      '*.config.mjs',
      'jest.setup.js',
      '.lintstagedrc.js',
      'sentry.client.config.js',
      'jest.config.js',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  // === Тестовые файлы (глобалы Jest) ===
  {
    files: ['**/*.spec.{ts,tsx,js}', '**/__tests__/**/*.{ts,tsx,js}'],
    languageOptions: {
      globals: { ...globals.jest },
    },
  },
]
