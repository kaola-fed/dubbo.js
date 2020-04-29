module.exports = {
    extends: [
        'eslint-config-alloy/typescript',
    ],
    globals: {
    },
    rules: {
        'indent': [
            'error',
            2,
            {
                SwitchCase: 1,
                flatTernaryExpressions: true
            }
        ],
        'complexity': [0, 20]
    }
};