export type DryvValidateFunctionResult =
  | DryvFieldValidationResult
  | string
  | null
  | undefined
  | Promise<DryvFieldValidationResult | string | null | undefined>

export interface DryvValidationRule<TModel extends object> {
  async?: boolean
  annotations?: {
    required?: boolean
    [path: string | symbol]: unknown
  }
  related?: (keyof TModel)[]
  group?: string
  validate: ($m: TModel, session: DryvValidationSession<TModel>) => DryvValidateFunctionResult
}

export type DrvvRuleInvocations<TModel extends object> = {
  [Property in keyof TModel]?: DryvValidationRule<TModel>[]
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

export type DryvProxy<TModel extends object> = TModel & {
  $validatable: DryvValidatable<TModel, DryvObject<TModel>>
}

export interface DryvGroupValidationResult {
  name: string
  results: {
    type: DryvValidationResultType
    texts: string[]
  }[]
}

export interface DryvValidatable<TModel extends object = any, TValue = any> {
  _isDryvValidatable: true
  required?: boolean | null
  text?: string | null
  path?: string | null
  group?: string | null
  groupShown?: boolean | null
  type?: DryvValidationResultType | null
  value?: TValue | undefined
  parent?: DryvValidatable | undefined
  field?: keyof TModel | undefined

  get hasError(): boolean

  get hasWarning(): boolean

  get isSuccess(): boolean

  validate(): Promise<DryvValidationResult>

  clear(): void

  set(response: DryvServerValidationResponse | DryvServerErrors): boolean

  updateValue(value: any): void
}

export interface DryvValidatableInternal<TModel extends object = any, TValue = any>
  extends DryvValidatable<TModel, TValue> {
  get session(): DryvValidationSession<TModel> | undefined
}

export interface DryvValidationGroup<TModel extends object> {
  name: string
  fields: DryvValidatable<TModel>
  text?: string | null
  type?: DryvValidationResultType | null
}

export type DryvObject<TModel extends object> = {
  [Property in keyof TModel]: TModel[Property] extends boolean
    ? DryvValidatable<TModel, TModel[Property]>
    : TModel[Property] extends string
      ? DryvValidatable<TModel, TModel[Property]>
      : TModel[Property] extends Date
        ? DryvValidatable<TModel, TModel[Property]>
        : TModel[Property] extends Array<infer ArrayType>
          ? DryvValidatable<TModel, TModel[Property]>
          : TModel[Property] extends object
            ? DryvObject<TModel[Property]>
            : DryvValidatable<TModel, TModel[Property]>
} & {
  $model: DryvProxy<TModel> | undefined
  toJSON(): any
}

export interface DryvValidationSessionInternal<TModel extends object>
  extends DryvValidationSession<TModel> {
  $initializing?: boolean
}

export interface DryvValidationSession<TModel extends object> {
  results: {
    fields: Record<string, DryvFieldValidationResult | undefined>
    groups: Record<string, DryvFieldValidationResult | undefined>
  }

  validateObject(
    objOrProxy: DryvValidatable<TModel> | DryvProxy<TModel>
  ): Promise<DryvValidationResult>

  validateField<TValue>(
    field: DryvValidatable<TModel, TValue>,
    model?: DryvProxy<TModel>
  ): Promise<DryvValidationResult>

  dryv: {
    callServer(url: string, method: string, data: any): Promise<any>

    handleResult(
      session: DryvValidationSession<TModel>,
      $m: TModel,
      field: keyof TModel,
      rule: DryvValidationRule<TModel> | undefined | null,
      result: any
    ): Promise<any>

    valueOfDate(date: string, locale: string, format: string): number
  }
}

export interface DryvOptions {
  exceptionHandling?: 'failValidation' | 'succeedValidation'

  excludedFields?: RegExp[]

  objectWrapper?<TObject>(object: TObject): TObject

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
