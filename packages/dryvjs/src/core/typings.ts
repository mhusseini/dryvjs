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
    [key: string | symbol]: unknown
  }
  validate: ($m: TModel, session: DryvValidationSession<TModel>) => DryvValidateFunctionResult
}

export type DrvvRuleInvocations<TModel extends object> = {
  [Property in keyof TModel]?: DryvValidationRule<TModel>[]
}

export interface DryvValidationRuleSet<TModel extends object, TParameters = object> {
  validators: DrvvRuleInvocations<TModel>
  disablers: DrvvRuleInvocations<TModel>
  parameters: TParameters
}

export interface DryvValidationRuleSetResolver {
  name: string

  resolve<TModel extends object, TParameters = object>(
    ruleSetName: string
  ): DryvValidationRuleSet<TModel, TParameters>
}

export interface DryvValidationResult<TModel extends object> {
  results: DryvFieldValidationResult[]
  hasErrors: boolean
  hasWarnings: boolean
  warningHash: string | undefined | null
}

export interface DryvFieldValidationResult {
  path?: string
  status?: DryvValidationResultStatus
  text?: string | null
  group?: string | null
}

export type DryvValidationResultStatus = 'error' | 'warning' | 'success' | string

export type DryvProxy<TModel extends object> = TModel & {
  $dryv: DryvValidatable<TModel, DryvObject<TModel>>
}

export interface DryvValidatable<TModel extends object = any, TValue = any> {
  _isDryvValidatable: true
  required?: boolean | null
  text?: string | null
  path?: string | null
  group?: string | null
  status?: DryvValidationResultStatus | null
  value: TValue | undefined
  parent: DryvValidatable | undefined
  field: keyof TModel | undefined

  validate(): Promise<DryvValidationResult<TModel> | null>

  clear(): void
}

export interface DryvValidatableInternal<TModel extends object = any, TValue = any>
  extends DryvValidatable<TModel, TValue> {
  get session(): DryvValidationSession<TModel> | undefined
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

  validateObject(
    objOrProxy: DryvValidatable<TModel> | DryvProxy<TModel>
  ): Promise<DryvValidationResult<TModel> | null>

  validateField<TValue>(
    field: DryvValidatable<TModel, TValue>,
    model?: TModel
  ): Promise<DryvValidationResult<TModel> | null>
}

export interface DryvOptions {
  exceptionHandling?: 'failValidation' | 'succeedValidation'

  excludedFields?: RegExp[]

  objectWrapper?<TObject>(object: TObject): TObject

  callServer?(url: string, method: string, data: any): Promise<any>

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