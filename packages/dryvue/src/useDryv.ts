import type {
  DryvObject,
  DryvOptions,
  DryvValidationResult,
  DryvValidationRuleSet,
  DryvValidationSession
} from 'dryvjs'
import {
  annotate,
  dryvOptions,
  dryvProxy,
  dryvRuleSet,
  DryvServerErrors,
  DryvServerValidationResponse,
  DryvValidatable,
  dryvValidationSession
} from 'dryvjs'
import { computed } from 'vue'
import type { Ref } from '@vue/reactivity'
import { useMappedField } from '@/useMappedField'
import { useMappedGroup } from '@/useMappedGroup'

export interface UseDryvResult<TModel extends object> {
  session: DryvValidationSession<TModel>
  model: TModel
  validatable: DryvObject<TModel>
  validate: () => Promise<DryvValidationResult>
  valid: Ref<boolean>
  clear: () => void
  setValidationResult: (result: DryvServerValidationResponse | DryvServerErrors) => boolean
  updateModel: (newValues: TModel) => void
  useMappedField<TTo>(field: keyof TModel, mappedValue: Ref<TTo>): DryvValidatable<any, TTo>
  useMappedGroup<TTo>(groupName: string, field: Ref<TTo>): DryvValidatable<any, TTo>
}

export function useDryv<TModel extends object>(
  model: TModel,
  ruleSet: string | DryvValidationRuleSet<TModel>,
  options?: DryvOptions
): UseDryvResult<TModel> {
  options = dryvOptions(options)
  ruleSet = findRuleSet(ruleSet)

  const session = dryvValidationSession<TModel>(options, ruleSet)
  const proxy = dryvProxy<TModel>(model, undefined, session, options)

  annotate<TModel>(proxy, ruleSet, options)

  return {
    session,
    model: proxy,
    validatable: proxy.$validatable.value!,
    validate: async () => await proxy.$validatable.validate(),
    valid: computed(() => !proxy.$validatable.type || proxy.$validatable.type === 'success'),
    clear: () => proxy.$validatable.clear(),
    updateModel: (newValues: TModel | DryvObject<TModel>) =>
      proxy.$validatable.updateValue(newValues),
    useMappedField: (field, mappedValue) =>
      useMappedField(proxy.$validatable.value!, field, mappedValue),
    useMappedGroup: (groupName, field) => useMappedGroup(session, groupName, field),
    setValidationResult: (result: DryvServerValidationResponse | DryvServerErrors) =>
      proxy.$validatable.set(result)
  }
}

function findRuleSet<TModel extends object>(ruleSet: string | DryvValidationRuleSet<TModel>) {
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
  return ruleSet
}
