import { createRouter, createWebHistory } from 'vue-router'

const soon = () => import('../views/ComingSoonView.vue')
const legal = () => import('../views/LegalView.vue')

export const router = createRouter({
  history: createWebHistory(),
  // Footer links like /privacy#california scroll to the section; new pages start at the top.
  scrollBehavior: (to, _from, saved) => saved ?? (to.hash ? { el: to.hash, top: 96 } : { top: 0 }),
  routes: [
    { path: '/', component: () => import('../views/HomeView.vue') },
    { path: '/feed', component: () => import('../views/FeedView.vue') },
    { path: '/create', component: () => import('../views/CreateView.vue') },
    { path: '/invite', component: () => import('../views/InviteView.vue') },
    { path: '/terms', component: legal, props: { doc: 'terms' } },
    { path: '/privacy', component: legal, props: { doc: 'privacy' } },
    { path: '/refunds', component: legal, props: { doc: 'refunds' } },
    { path: '/credits', component: legal, props: { doc: 'credits' } },
    { path: '/settings', component: () => import('../views/SettingsView.vue') },
    { path: '/play/:code', component: () => import('../views/PlayView.vue') },
    { path: '/room/:code', component: () => import('../views/RoomView.vue') },
    { path: '/drama/:slug', redirect: (to) => `/watch/${to.params.slug}/1` },
    { path: '/watch/:slug/:episode', component: () => import('../views/WatchView.vue') },
    { path: '/invite/:code', component: soon },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
