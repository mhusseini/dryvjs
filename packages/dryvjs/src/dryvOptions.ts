import type { DryvOptions } from '@/.'
import { defaultDryvOptions } from '@/.'

export function dryvOptions(...options: (DryvOptions | undefined)[]): DryvOptions {
  return Object.assign({}, defaultDryvOptions, ...options)
}
