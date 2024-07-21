import { DryvValidator } from '@/core/DryvValidator'

export type DryvValidateFunctionResult =
  | DryvFieldValidationResult
  | string
  | boolean
  | null
  | undefined
  | Promise<DryvFieldValidationResult | string | null | undefined>

export interface DryvValidationRule<TModel extends object> {
  async?: boolean
  annotations?: {
    required?: boolean
    [path: string]: unknown
  }
  related?: string[]
  group?: string
  validate: ($m: TModel, session: DryvValidationSession<TModel>) => DryvValidateFunctionResult
}

export type DrvvRuleInvocations<TModel extends object> = {
  [Property in keyof TModel]?: DryvValidationRule<TModel>[]
} & {
  [path: string]: DryvValidationRule<TModel>[]
}

export interface DryvValidationRuleSet<TModel extends object, TParameters = object> {
  validators: DrvvRuleInvocations<TModel>
  disablers?: DrvvRuleInvocations<TModel>
  parameters?: TParameters
}

export interface DryvValidationRuleSetResolver {
  name: string

  resolve<TModel extends object, TParameters = object>(
    ruleSetName: string
  ): DryvValidationRuleSet<TModel, TParameters>
}

export interface DryvValidationResult {
  results: DryvFieldValidationResult[]
  success: boolean
  hasErrors: boolean
  hasWarnings: boolean
  warningHash: string | undefined | null
  path?: string
}

export interface DryvFieldValidationResult {
  path?: string
  type?: DryvValidationResultType
  text?: string | null
  group?: string | null
}

export type DryvValidationResultType = 'error' | 'warning' | 'success' | string

export interface DryvGroupValidationResult {
  name: string
  results: {
    type: DryvValidationResultType
    texts: string[]
  }[]
}

export interface DryvValidationSessionInternal<TModel extends object>
  extends DryvValidationSession<TModel> {
  $initializing?: boolean
}

export interface DryvValidationSession<TModel extends object, TParameters = object> {
  results: {
    fields: Record<string, DryvFieldValidationResult | undefined>
    groups: Record<string, DryvFieldValidationResult | undefined>
  }

  validateObject(objectValidator: DryvValidator<TModel, TParameters>): Promise<DryvValidationResult>

  validateField(
    field: DryvValidator<TModel, TParameters>,
    model?: TModel
  ): Promise<DryvValidationResult>

  dryv: {
    callServer(url: string, method: string, data: any): Promise<any>

    handleResult(
      session: DryvValidationSession<TModel>,
      $m: TModel,
      field: keyof TModel | string,
      rule: DryvValidationRule<TModel> | undefined | null,
      result: any
    ): Promise<any>

    valueOfDate(date: string, locale: string, format: string): number
  }
}

export interface DryvOptions {
  exceptionHandling?: 'failValidation' | 'succeedValidation'

  excludedFields?: RegExp[]

  objectWrapper<TObject>(object: TObject): TObject

  callServer?(url: string, method: string, data: any): Promise<DryvServerValidationResponse>

  handleResult?<TModel extends object>(
    session: DryvValidationSession<TModel>,
    $m: TModel,
    field: keyof TModel,
    rule: DryvValidationRule<TModel>,
    result: any
  ): Promise<any>

  valueOfDate?(date: string, locale: string, format: string): number

  validationTrigger?: 'immediate' | 'auto' | 'manual' | 'autoAfterManual'
}

export type DryvServerValidationResponse =
  | any
  | {
      success: boolean
      messages: DryvServerErrors
    }

export interface DryvServerErrors {
  [field: string]: DryvFieldValidationResult
}

export interface FieldEvent<TModel> {
  oldValue: any
  newValue: any
  field: keyof TModel
}
