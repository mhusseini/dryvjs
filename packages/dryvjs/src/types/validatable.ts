import type { DryvArrayValidator } from '@/validators/DryvArrayValidator'
import type { DryvObjectValidator } from '@/validators/DryvObjectValidator'
import type { DryvValidationResult } from './results'
import type { DryvValidationResultType } from './rules'

/**
 * Read-only view of a scalar field validator's state, exposed through the facade proxy.
 *
 * @typeParam TValue - The type of the field's value.
 */
export type DryvFieldView<TValue = object> = {
    /** Dot-notation path of this field. */
    path: string
    /** Current validation result type, or `null`. */
    type: DryvValidationResultType | null
    /** Current validation message text, or `null`. */
    text: string | null
    /** Validation group this field belongs to, or `null`. */
    group: string | null
    /** Whether the validation group UI is currently shown. */
    groupShown: boolean
    /** `true` if the field has no errors or warnings. */
    success: boolean
    /** `true` if the field has an error. */
    hasErrors: boolean
    /** `true` if the field has a warning. */
    hasWarnings: boolean
    /** Hash of warning texts for deduplication. */
    warningHash: string | undefined | null
    /** The current value of the field. */
    value: TValue
    /** Triggers validation for this field and returns the result. */
    validate(): Promise<DryvValidationResult>
}

/**
 * Recursive mapped type that resolves a model property type to its
 * corresponding validatable facade type (field view, object, or array).
 *
 * @typeParam TModel - The model property type to resolve.
 */
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

/**
 * Developer-facing facade type for validated arrays.
 * Index access returns the element's validatable facade; array methods
 * are forwarded to the underlying observable array proxy.
 *
 * @typeParam TModel - The element type of the array.
 */
export interface DryvValidatableArray<TModel = any> extends Array<DryvValidatable<TModel>> {
    /** Escape-hatch access to the underlying `DryvArrayValidator`. */
    $validator: DryvArrayValidator<TModel>
}

/**
 * Developer-facing facade type for validated objects.
 * Property access returns the field's validatable facade (field view, nested object, or array).
 *
 * @typeParam TModel - The model type.
 */
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

/**
 * Compile-time union of types whose instances should be treated as opaque
 * values (not recursively proxied).
 *
 * Sync with the runtime `specialTypes` array is enforced by the
 * compile-time assertion in `__tests__/special-type-sync.test.ts`.
 */
export type SpecialType =
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
