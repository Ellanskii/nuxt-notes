export default {
  extends: ['stylelint-config-standard-scss'],
  overrides: [
    {
      files: ['**/*.vue'],
      customSyntax: 'postcss-html',
    },
  ],
  rules: {
    // БЭМ: block__element--modifier.
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z][a-z0-9]*(-[a-z0-9]+)*)?(--[a-z][a-z0-9]*(-[a-z0-9]+)*)?$',
      { message: 'Ожидается имя класса в БЭМ-нотации' },
    ],
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['deep', 'global'] }],
    'selector-pseudo-element-no-unknown': [true, { ignorePseudoElements: ['v-deep'] }],
    'no-descending-specificity': null,
    // Токены сгруппированы по смыслу пустыми строками — не схлопывать.
    'custom-property-empty-line-before': null,
  },
  ignoreFiles: ['node_modules/**', '.nuxt/**', '.output/**', 'coverage/**'],
}
