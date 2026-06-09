import type { DryvRuleContext } from '@/session/DryvRuleContext'

/**
 * Union of all possible return types from a validation rule's `validate` function.
 * A rule may return a structured result, an error string, a boolean pass/fail,
 * `null`/`undefined` (pass), or a `Promise` resolving to any of these.
 */
export type DryvValidateFunctionResult =
    | DryvFieldValidationResult
    | string
    | boolean
    | null
    | undefined
    | Promise<DryvFieldValidationResult | string | null | undefined>

/**
 * A single validation or disabler rule for a model field.
 *
 * @typeParam TModel - The root model type this rule validates against.
 */
export interface DryvValidationRule<TModel extends object> {
    /** Whether this rule performs asynchronous validation (e.g. server calls). */
    async?: boolean
    /** Static annotations attached to the rule (e.g. `required`). */
    annotations?: {
        /** Marks the field as required in the UI. */
        required?: boolean
        [path: string]: unknown
    }
    /** Paths of related fields that should be re-validated when this rule runs. */
    related?: string[]
    /** Validation group this rule belongs to. */
    group?: string
    /** The validation function invoked with the model and a rule context. */
    validate: <TInput = TModel>(
        $m: TInput,
        context: DryvRuleContext<TModel>
    ) => DryvValidateFunctionResult
}

/**
 * Map of field paths (or model keys) to their ordered list of validation rules.
 *
 * @typeParam TModel - The root model type.
 */
export type DryvRuleInvocations<TModel extends object> = {
    [Property in keyof TModel]?: DryvValidationRule<TModel>[]
} & {
    [path: string]: DryvValidationRule<TModel>[]
}

/**
 * A named collection of validation rules, disabler rules, and parameters
 * that together define the validation behavior for a model.
 *
 * @typeParam TModel - The root model type.
 * @typeParam TParameters - The type of externally-loaded parameters available to rules.
 */
export interface DryvValidationRuleSet<TModel extends object, TParameters = object> {
    /** Unique name identifying this rule set. */
    name: string
    /** Validation rules keyed by field path. */
    validators: DryvRuleInvocations<TModel>
    /** Disabler rules keyed by field path. When a disabler fires, validation is skipped. */
    disablers?: DryvRuleInvocations<TModel>
    /** Externally-loaded parameters accessible to rules via `context.parameter()`. */
    parameters?: TParameters
}

/**
 * Resolves a named rule set from an external source (e.g. server-generated rules).
 */
export interface DryvValidationRuleSetResolver {
    /** Display name of this resolver. */
    name: string

    /**
     * Attempts to resolve a rule set by name.
     * @returns The resolved rule set, or `undefined` if not found.
     */
    resolve<TModel extends object, TParameters = object>(
        ruleSetName: string
    ): DryvValidationRuleSet<TModel, TParameters>
}

/** Validation result for a single field. */
export interface DryvFieldValidationResult {
    /** Dot-notation path of the validated field. */
    path?: string | null
    /** Severity of the result (`'error'`, `'warning'`, `'success'`). */
    type?: DryvValidationResultType
    /** Human-readable validation message. */
    text?: string | null
    /** Validation group this result belongs to. */
    group?: string | null
}

/** Validation severity level. Standard values are `'error'`, `'warning'`, and `'success'`. */
export type DryvValidationResultType = 'error' | 'warning' | 'success' | string
