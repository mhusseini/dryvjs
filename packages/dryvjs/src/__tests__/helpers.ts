import {
  DryvOptions,
  DryvValidationRuleSet,
  DryvValidationSession,
  DryvObjectValidator,
  dryvOptions
} from '@/.'

export interface SimpleModel {
  name: string
  email: string
  age: number
}

export interface NestedModel {
  title: string
  address: {
    street: string
    city: string
  }
}

export interface ModelWithArray {
  tags: string[]
  name: string
}

export function createOptions(overrides?: Partial<DryvOptions>): DryvOptions {
  return dryvOptions(overrides as DryvOptions | undefined)
}

export function createRuleSet<TModel extends object>(
  partial: Partial<DryvValidationRuleSet<TModel>> = {}
): DryvValidationRuleSet<TModel> {
  return {
    name: partial.name ?? 'testRuleSet',
    validators: partial.validators ?? ({} as any),
    disablers: partial.disablers,
    parameters: partial.parameters
  }
}

export function createSession<TModel extends object>(
  ruleSet: DryvValidationRuleSet<TModel>,
  optionOverrides?: Partial<DryvOptions>
): DryvValidationSession<TModel> {
  const options = createOptions(optionOverrides)
  return new DryvValidationSession<TModel>(options, ruleSet)
}

export function createObjectValidator<TModel extends object>(
  model: TModel,
  ruleSet: DryvValidationRuleSet<TModel>,
  optionOverrides?: Partial<DryvOptions>
): { validator: DryvObjectValidator<TModel>; session: DryvValidationSession<TModel> } {
  const options = createOptions({ validationTrigger: 'auto', ...optionOverrides })
  const session = new DryvValidationSession<TModel>(options, ruleSet)
  const validator = new DryvObjectValidator<TModel>(model, session, undefined, options)
  return { validator, session }
}
