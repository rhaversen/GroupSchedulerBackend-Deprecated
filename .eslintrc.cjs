module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": [
        "standard-with-typescript",
    ],
    "overrides": [
        {
            "env": {
                "node": true
            },
            "files": [
                ".eslintrc.{js,cjs}"
            ],
            "parserOptions": {
                "sourceType": "script"
            }
        }
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module",
        "project": "./tsconfig.json"
    },
    "rules": {
        'no-mutate-config-get/no-mutate-config-get': 'warn',
        "indent": ["error", 4], // Standard ESLint indent rule
        "@typescript-eslint/indent": ["error", 4] // TypeScript-specific indent rule
    },
    "settings": {
        'import/resolver': {
          node: {
            paths: ['eslint-rules/']
          }
        },
    }    
}
