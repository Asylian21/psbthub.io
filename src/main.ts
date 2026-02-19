/**
 * Application bootstrap entrypoint.
 *
 * Wires Vue, Pinia, Router, PrimeVue, and theme initialization
 * before mounting the root app component.
 */
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import { createApp } from 'vue'
import router from './router'
import { installErrorMonitoring } from './infra/observability/errorMonitoring'
import { useAppStore } from './stores/app'
import './css/index.css'
import 'primeicons/primeicons.css'
import App from './App.vue'
import PsbtHubPreset from './theme/preset'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: PsbtHubPreset,
    options: {
      darkModeSelector: '.app-dark',
    },
  },
})
app.use(ToastService)

const appStore = useAppStore(pinia)
appStore.initializeTheme()
installErrorMonitoring(app)

app.mount('#app')
