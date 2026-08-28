export default {
  extends: ['stylelint-config-standard-scss'],
  rules: {
    // Vue SFC: :deep(), ::v-deep и прочие псевдоклассы фреймворка.
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['deep', 'global'] }],
    'selector-pseudo-element-no-unknown': [true, { ignorePseudoElements: ['v-deep'] }],
    'scss/at-rule-no-unknown': [true, { ignoreAtRules: ['use', 'mixin', 'include', 'if', 'else', 'each', 'content'] }],
    'no-descending-specificity': null,
  },
  ignoreFiles: ['node_modules/**', '.nuxt/**', '.output/**', 'coverage/**'],
}
