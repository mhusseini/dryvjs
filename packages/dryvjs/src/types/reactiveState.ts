import type { DryvValidationResultType } from './rules'

export interface DryvReactiveState {
  path: string | null
  uniquePath: string | null
  text: string | null
  group: string | null
  required: boolean | null
  groupShown: boolean
  type: DryvValidationResultType | null
  isDirty: boolean
}
