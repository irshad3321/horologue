import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.es2021
            }
        },
        rules: {
            
            'no-unused-vars': ['warn', { 
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrors: 'none'
            }],
            'no-undef': 'error',
            'no-console': 'off', 
            'no-debugger': 'warn',
            'no-useless-catch': 'warn',
            
            // Best Practices
            'eqeqeq': ['warn', 'always', { null: 'ignore' }],
            'no-var': 'warn',
            'prefer-const': 'warn',
            'prefer-arrow-callback': 'off',
            'no-useless-return': 'warn',
            'no-else-return': 'warn',
            
            // Code Style
            'indent': 'off', 
            'quotes': 'off', 
            'semi': ['warn', 'always'],
            'comma-dangle': 'off', 
            'arrow-spacing': 'warn',
            'space-before-blocks': 'warn',
            'keyword-spacing': 'warn',
            'object-curly-spacing': ['warn', 'always'],
            'array-bracket-spacing': ['warn', 'never'],
            
            // Async/Await
            'require-await': 'off', 
            'no-async-promise-executor': 'error',
            
            // Error Handling
            'no-throw-literal': 'error',
            
            // Node.js specific
            'no-path-concat': 'error'
        }
    },
    {
        // Browser-side JavaScript files
        files: ['public/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.browser,
                Swal: 'readonly',
                Razorpay: 'readonly'
            }
        }
    },
    {
        // Ignore EJS files and other non-JS files
        ignores: [
            'node_modules/**',
            'public/css/**',
            'public/images/**',
            'views/**/*.ejs',
            '**/*.ejs',
            '.env',
            '*.log'
        ]
    }
];
