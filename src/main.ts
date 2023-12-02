import './assets/main.css'

import {createApp} from 'vue'
import App from './App.vue'
import {DryvPlugin} from "@/dryv";

createApp(App)
    .use(DryvPlugin)
    .mount('#app')
