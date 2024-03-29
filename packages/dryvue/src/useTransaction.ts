import { dryvTransaction, type DryvOptions, DryvTransactionOptions } from 'dryvjs'
import { computed } from 'vue'
import type { Ref } from '@vue/reactivity'

export interface UseTransactionResult<TModel extends object = any> {
  rollback: () => void
  commit: () => void
  model: TModel
  dirty: Ref<boolean>
}

export function useTransaction<TModel extends object>(
  model: TModel,
  options?: DryvTransactionOptions
): UseTransactionResult<TModel> {
  const result = dryvTransaction(model, options)

  return {
    ...result,
    dirty: computed(result.dirty)
  }
}
