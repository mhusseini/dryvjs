import './assets/main.css'

import {createApp} from 'vue'
import App from './App.vue'
import {Dryv, DryvStaticRuleSets} from "@/dryv";
import {personalDataValidationRules} from "@/PersonalDataValidationRules";

createApp(App)
    .use(Dryv)
    .use(DryvStaticRuleSets, {
        PersonalData: personalDataValidationRules
    })
    .mount('#app')
