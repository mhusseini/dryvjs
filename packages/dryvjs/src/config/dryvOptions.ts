import type { DryvOptions } from '@/types'
import { defaultDryvOptions } from './defaultDryvOptions'

export function dryvOptions(...options: (DryvOptions | undefined)[]): DryvOptions {
  return Object.assign({}, defaultDryvOptions, ...options)
}
