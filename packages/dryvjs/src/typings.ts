import { DryvValidationSession } from './DryvValidationSession'
import { DryvArrayValidator } from '@/DryvArrayValidator'
import { DryvObjectValidator } from '@/DryvObjectValidator'

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
  validate: <TInput = TModel>(
    $m: TInput,
    session: DryvValidationSession<TModel>
  ) => DryvValidateFunctionResult
}

export type DrvvRuleInvocations<TModel extends object> = {
  [Property in keyof TModel]?: DryvValidationRule<TModel>[]
} & {
  [path: string]: DryvValidationRule<TModel>[]
}

export interface DryvValidationRuleSet<TModel extends object, TParameters = object> {
  name: string
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
  hasNewWarnings: boolean | undefined | null
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

export interface DryvOptions {
  exceptionHandling?: 'failValidation' | 'succeedValidation'

  excludedFields?: RegExp[]
  baseUrl?: string
  reactiveWrapper<TObject>(object: TObject): TObject

  loadParameters?<TParameters = object>(validationSetName: string): Promise<TParameters>

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

export interface ArrayEvent<TModel> {
  action: 'insert' | 'append' | 'remove' | 'replace'
  oldValue?: TModel[]
  newValue?: TModel[]
}

export type DryvValidatableField<TValue = object> = {
  path: string
  type: DryvValidationResultType | null
  text: string | null
  group: string | null
  groupShown: boolean
  success: boolean
  hasErrors: boolean
  hasWarnings: boolean
  warningHash: string | undefined | null
  value: TValue
  validate(): Promise<DryvValidationResult>
}

export type DryvValidatable<TModel> =
  NonNullable<TModel> extends Array<infer TItem>
    ? DryvValidatableArray<TItem>
    : NonNullable<TModel> extends FileList
      ? DryvValidatableArray<File>
      : NonNullable<TModel> extends SpecialType
        ? DryvValidatableField<TModel>
        : NonNullable<TModel> extends object
          ? DryvValidatableObject<NonNullable<TModel>>
          : DryvValidatableField<TModel>

export interface DryvValidatableArray<TModel = any> extends Array<DryvValidatable<TModel>> {
  $validator: DryvArrayValidator<TModel>
}

export type DryvValidatableObject<TModel extends object> = {
  [Property in keyof TModel]: NonNullable<TModel[Property]> extends Array<infer TItem>
    ? DryvValidatableArray<TItem>
    : NonNullable<TModel[Property]> extends FileList
      ? DryvValidatableArray<File>
      : NonNullable<TModel[Property]> extends SpecialType
        ? DryvValidatableField<TModel[Property]>
        : NonNullable<TModel[Property]> extends object
          ? DryvValidatableObject<NonNullable<TModel[Property]>>
          : DryvValidatableField<TModel[Property]>
} & {
  $validator: DryvObjectValidator<TModel>
}

type SpecialType =
  // File and Blob
  | File
  | FileList
  | Blob

  // ArrayBuffer and Typed Arrays
  | ArrayBuffer
  | DataView
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Float32Array
  | Float64Array
  | BigUint64Array
  | BigInt64Array

  // DOM Elements
  | HTMLElement
  | SVGElement
  | Document
  | Window

  // WebAssembly
  | WebAssembly.Module
  | WebAssembly.Instance
  | WebAssembly.Memory
  | WebAssembly.Table

  // Promise and Error
  | Promise<any>
  | Error
  | TypeError
  | RangeError
  | ReferenceError
  | SyntaxError
  | URIError
  | EvalError
