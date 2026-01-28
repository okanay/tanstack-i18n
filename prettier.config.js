/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
export default {
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: 'src/assets/styles/globals.css',
  printWidth: 144,
  singleQuote: true,
  semi: false,
  trailingComma: 'all',
  tabWidth: 2,
}
