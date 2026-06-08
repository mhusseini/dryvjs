export default defineNuxtConfig({
  modules: ['../src/module'],

  dryv: {
    baseUrl: '/api/validation',
    handleWarnings: true,
  },
})
