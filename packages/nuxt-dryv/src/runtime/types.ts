import type { DryvOptions } from '@softwareproduction/dryvue'

declare module '#app' {
  interface RuntimeNuxtHooks {
    'dryv:options': (options: DryvOptions) => void | Promise<void>
  }
}

export {}
