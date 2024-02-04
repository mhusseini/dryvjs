import type {
  DryvObject,
  DryvOptions,
  DryvValidatable,
  DryvValidationResult,
  DryvValidationRuleSet,
  DryvValidationSession
} from 'dryvjs'
import { annotate, dryvOptions, dryvProxy, dryvRuleSet, dryvValidationSession } from 'dryvjs'
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
  ruleSet: string | DryvValidationRuleSet<TModel>,
  options?: DryvOptions
): UseDryvResult<TModel> {
  options = dryvOptions(options)

  switch (typeof ruleSet) {
    case 'undefined':
      throw new Error(
        `The ruleSet parameter must be either a valid rule set name of a valid rule set.`
      )
    case 'string': {
      const ruleSetName = ruleSet
      const foundRuleSet = dryvRuleSet<TModel>(ruleSetName)

      if (!foundRuleSet) {
        throw new Error(`Could not find a validation rule set with the name '${ruleSetName}'`)
      }

      ruleSet = foundRuleSet
      break
    }
  }

  const session = dryvValidationSession<TModel>(options, ruleSet)
  const proxy = dryvProxy<TModel>(model, undefined, session, options)

  annotate<TModel>(proxy, ruleSet, options)

  return {
    session,
    model: proxy,
    result: proxy.$dryv,
    bindingModel: proxy.$dryv.value!,
    validate: async () => await proxy.$dryv.validate(),
    valid: computed(() => !proxy.$dryv.status || proxy.$dryv.status === 'success'),
    clear: () => proxy.$dryv.clear()
  }
}
