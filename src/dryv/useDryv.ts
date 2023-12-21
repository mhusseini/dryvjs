import type {
  DryvObject,
  DryvOptions,
  DryvValidatable,
  DryvValidationResult,
  DryvValidationSession
} from './types'
import { annotate, dryvOptions, dryvProxy, dryvRuleSet, dryvValidationSession } from './core'
import { computed } from 'vue'
import type { Ref } from '@vue/reactivity'

export interface UseDryvResult<TModel extends object> {
  session: DryvValidationSession<TModel>
  model: TModel
  result: DryvValidatable<TModel, DryvObject<TModel>>
  bindingModel: DryvObject<TModel>
  validate: () => Promise<DryvValidationResult<TModel> | null>
  valid: Ref<boolean>
  clear: () => void
}

export function useDryv<TModel extends object>(
  model: TModel,
  ruleSetName: string,
  options?: DryvOptions
): UseDryvResult<TModel> {
  options = dryvOptions(options)

  const ruleSet = dryvRuleSet<TModel>(ruleSetName)
  const session = dryvValidationSession<TModel>(options, ruleSet)
  const proxy = dryvProxy<TModel>(model, options)

  annotate<TModel>(proxy, ruleSet, options)

  return {
    session,
    model: proxy,
    result: proxy.$dryv,
    bindingModel: proxy.$dryv.value!,
    validate: async () => await session.validateObject(proxy),
    valid: computed(() => !proxy.$dryv.status || proxy.$dryv.status === 'success'),
    clear: () => proxy.$dryv.clear()
  }
}
