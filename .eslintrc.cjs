module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": [
        "standard-with-typescript",
    ],

    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module",
        "project": "./tsconfig.json"
    },
    "rules": {
        "indent": ["error", 4], // Standard ESLint indent rule
        "@typescript-eslint/indent": ["error", 4] // TypeScript-specific indent rule
    },
    "settings": {
        'import/resolver': {
            node: {
                paths: ['./eslint-rules']
            }
        },
    }
}
