import { createResolver, defineNuxtModule, addPlugin, addImports } from '@nuxt/kit'
import { defu } from 'defu'
import type { Nuxt } from '@nuxt/schema'

export interface ModuleOptions {
  /**
   * Base URL used for server-side (SSR) validation calls.
   * Typically points to an internal backend service (e.g. `http://backend:5000/api/validation`).
   */
  serverBaseUrl?: string

  /**
   * Base URL used for client-side validation calls.
   * When not set, requests use relative paths (i.e. the current application URL).
   */
  clientBaseUrl?: string

  /**
   * Path to the generated validation rule sets, resolved as an alias `#dryv`.
   * If not set, no alias is registered.
   *
   * @example 'types/generated/validation/index'
   */
  validationPath?: string

  /**
   * Whether to automatically register the warning deduplication handler.
   * When enabled, repeated identical warnings are suppressed on subsequent validations.
   *
   * @default true
   */
  handleWarnings?: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-dryv',
    configKey: 'dryv',
    compatibility: {
      nuxt: '>=3.0.0',
    },
  },
  defaults: {
    serverBaseUrl: undefined,
    clientBaseUrl: undefined,
    validationPath: undefined,
    handleWarnings: true,
  },
  async setup(options, nuxt: Nuxt) {
    const resolver = createResolver(import.meta.url)

    // Expose options to runtime via public runtimeConfig
    nuxt.options.runtimeConfig.public.dryv = defu(
      nuxt.options.runtimeConfig.public.dryv as Record<string, unknown> || {},
      options,
    )

    // Register the runtime plugin
    addPlugin(resolver.resolve('./runtime/plugins/dryv'))

    // Register composable auto-imports
    addImports([
      { name: 'addResultHandler', from: resolver.resolve('./runtime/composables/useResultHandlers') },
      { name: 'removeResultHandler', from: resolver.resolve('./runtime/composables/useResultHandlers') },
    ])

    // Register #dryv alias if a validation path is configured
    if (options.validationPath) {
      const { join } = await import('path')
      nuxt.options.alias['#dryv'] = join(nuxt.options.rootDir, options.validationPath)
    }
  },
})
