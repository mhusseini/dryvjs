import type {
  DryvObject,
  DryvOptions,
  DryvValidationResult,
  DryvValidationRuleSet,
  DryvValidationSession
} from 'dryvjs'
import {
  DryvObjectValidator,
  dryvOptions,
  dryvRuleSet,
  DryvServerErrors,
  DryvServerValidationResponse,
  DryvValidatable
} from 'dryvjs'
import { computed, isRef, watch, type Ref } from 'vue'
import { useMappedField } from './useMappedField'
import { useMappedGroup } from './useMappedGroup'
import { dryvValidatorSession } from 'dryvjs/dist/core/v2/dryvValidationSession'
import { annotateValidator } from 'dryvjs/dist/core/annotateValidator'

export interface UseDryvResult<TModel extends object, TParameters = object> {
  session: DryvValidationSession<TModel>
  model: TModel
  parameters?: TParameters
  validatable: DryvObjectValidator<TModel, TParameters>
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
  const session = dryvValidatorSession<TModel, TParameters>(options, ruleSet)
  let validator: DryvObjectValidator<TModel, TParameters>

  if (isRef(model)) {
    const ref = model
    validator = new DryvObjectValidator<TModel, TParameters>(
      model.value ?? ({} as any),
      session,
      undefined,
      options
    )
    watch(ref, (newModel) => (validator.value = newModel))
    if (!model.value) {
      throw new Error('The initial value of the model cannot be null or undefined.')
    }
  } else {
    validator = new DryvObjectValidator<TModel, TParameters>(model, session, undefined, options)
  }
  
  annotateValidator<TModel, TParameters>(validator, ruleSet, options)

  return {
    session,
    model: validator.proxy,
    parameters: ruleSet.parameters,
    validatable: validator.transparentProxy,
    validate: async () => await validator.validate(),
    valid: computed(() => validator.isSuccess),
    clear: () => validator.clear(),
    updateModel: (newValues: TModel) => (validator.value = newValues),
    useMappedField: (field: any, mappedValue: any) => {
      throw new Error('Method not implemented.')
    },
    useMappedGroup: (groupName: string, field: Ref<unknown>) =>
      useMappedGroup(session, groupName, field),
    setValidationResult: (result: DryvServerValidationResponse | DryvServerErrors) =>
      validator.setValidationResult(result)
  } as any
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
