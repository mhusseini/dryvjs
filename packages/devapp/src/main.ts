import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { Dryv, DryvStaticRuleSets } from 'dryvue'
import { personalDataValidationRules } from '@/PersonalDataValidationRules'

createApp(App)
  .use(Dryv)
  .use(DryvStaticRuleSets, {
    PersonalData: personalDataValidationRules
  })
  .mount('#app')
