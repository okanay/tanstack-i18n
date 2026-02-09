import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import * as TanstackQuery from './providers/tanstack-query'
import { routeTree } from './routeTree.gen'
import { deLocalizeUrl, localizeUrl } from './i18n/rewrite'
import { DefaultError } from './features/systems/default-error'
import { DefaultNotFound } from './features/systems/default-not-found'

export const getRouter = () => {
  const rqContext = TanstackQuery.getContext()

  const router = createRouter({
    context: {
      ...rqContext,
    },
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPreload: 'intent',
    defaultErrorComponent: DefaultError,
    defaultNotFoundComponent: DefaultNotFound,
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
  })

  setupRouterSsrQueryIntegration({
    router,
    queryClient: rqContext.queryClient,
  })

  return router
}
