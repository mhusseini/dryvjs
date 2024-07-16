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
import { computed, isRef, watch, type Ref } from 'vue'
import { useMappedField } from './useMappedField'
import { useMappedGroup } from './useMappedGroup'

export interface UseDryvResult<TModel extends object, TParameters = object> {
  session: DryvValidationSession<TModel>
  model: TModel
  parameters?: TParameters
  validatable: DryvObject<TModel>
  validate: () => Promise<DryvValidationResult>
  valid: Ref<boolean>
  clear: () => void
  setValidationResult: (result: DryvServerValidationResponse | DryvServerErrors) => boolean
  updateModel: (newValues: TModel) => void

  useMappedField<TTo>(
    field: keyof TModel,
    mappedValue: Ref<TTo | undefined>
  ): DryvValidatable<any, TTo>

  useMappedGroup<TTo>(groupName: string, field: Ref<TTo | undefined>): DryvValidatable<any, TTo>
}

export function useDryv<TModel extends object, TParameters = object>(
  model: TModel | Ref<TModel | undefined>,
  ruleSetOrName: string | DryvValidationRuleSet<TModel, TParameters>,
  options?: DryvOptions
): UseDryvResult<TModel, TParameters> {
  options = dryvOptions(options)
  const ruleSet = findRuleSet<TModel, TParameters>(ruleSetOrName)

  if (isRef(model)) {
    const ref = model
    watch(ref, (newModel) => proxy.$validatable.updateValue(newModel))
    if (!model.value) {
      throw new Error('The initial value of the model cannot be null or undefined.')
    }
    model = model.value
  }

  const session = dryvValidationSession<TModel, TParameters>(options, ruleSet)
  const proxy = dryvProxy<TModel>(model, undefined, session, options)

  annotate<TModel, TParameters>(proxy, ruleSet, options)

  return {
    session,
    model: proxy,
    parameters: ruleSet.parameters,
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

function findRuleSet<TModel extends object, TParameters = object>(
  ruleSet: string | DryvValidationRuleSet<TModel, TParameters>
): DryvValidationRuleSet<TModel, TParameters> {
  switch (typeof ruleSet) {
    case 'undefined':
      throw new Error(
        `The ruleSet parameter must be either a valid rule set name of a valid rule set.`
      )
    case 'string': {
      const ruleSetName = ruleSet
      const foundRuleSet = dryvRuleSet<TModel, TParameters>(ruleSetName)

      if (!foundRuleSet) {
        throw new Error(`Could not find a validation rule set with the name '${ruleSetName}'`)
      }

      return foundRuleSet
    }
  }
  return ruleSet
}
