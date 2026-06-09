import type { DryvArrayValidator } from '@/validators/DryvArrayValidator'
import type { DryvObjectValidator } from '@/validators/DryvObjectValidator'
import type { DryvValidationResult } from './results'
import type { DryvValidationResultType } from './rules'

export type DryvFieldView<TValue = object> = {
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
                ? DryvFieldView<TModel>
                : NonNullable<TModel> extends object
                    ? DryvValidatableObject<NonNullable<TModel>>
                    : DryvFieldView<TModel>

export interface DryvValidatableArray<TModel = any> extends Array<DryvValidatable<TModel>> {
    $validator: DryvArrayValidator<TModel>
}

export type DryvValidatableObject<TModel extends object> = {
    [Property in keyof TModel]: NonNullable<TModel[Property]> extends Array<infer TItem>
        ? DryvValidatableArray<TItem>
        : NonNullable<TModel[Property]> extends FileList
            ? DryvValidatableArray<File>
            : NonNullable<TModel[Property]> extends SpecialType
                ? DryvFieldView<TModel[Property]>
                : NonNullable<TModel[Property]> extends object
                    ? DryvValidatableObject<NonNullable<TModel[Property]>>
                    : DryvFieldView<TModel[Property]>
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
