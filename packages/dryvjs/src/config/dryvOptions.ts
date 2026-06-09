import type { DryvOptions, ResolvedDryvOptions } from '@/types'
import { defaultDryvOptions } from './defaultDryvOptions'

/**
 * Merges one or more option objects with the defaults to produce a fully-resolved options object.
 *
 * @param options - Option objects to merge (later entries override earlier ones).
 * @returns A fully-resolved options object with all defaults applied.
 */
export function dryvOptions(...options: (DryvOptions | undefined)[]): ResolvedDryvOptions {
  return Object.assign({}, defaultDryvOptions, ...options) as ResolvedDryvOptions
}
