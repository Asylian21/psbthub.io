/**
 * Central application router.
 *
 * Defines public landing, app workspace, and share-decrypt routes.
 * Also handles smooth hash scrolling for landing page sections.
 */
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('../views/LandingView.vue'),
    },
    {
      path: '/app',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/p/:id',
      name: 'share',
      component: () => import('../views/ShareView.vue'),
    },
    {
      path: '/share/:id',
      redirect: (to) => ({ name: 'share', params: { id: to.params.id } }),
    },
  ],
})

export default router
