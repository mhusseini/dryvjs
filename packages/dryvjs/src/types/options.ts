import type { DryvValidationSession } from '@/session/DryvValidationSession'
import type { DryvValidationRule, DryvValidationRuleSetResolver } from './rules'
import type { DryvServerValidationResponse } from './results'
import type { ValidationTriggerName } from '@/session/validationTriggerPolicy'

/**
 * Required options that must always be present.
 */
export interface DryvRequiredOptions {
    /** Wraps an object with framework-specific reactivity (e.g. Vue `reactive()`). */
    reactiveWrapper<TObject>(object: TObject): TObject
    /** Controls when field validation is triggered. */
    validationTrigger: ValidationTriggerName
}

/**
 * Optional/pluggable options with defaults provided by `dryvOptions()`.
 */
export interface DryvPluggableOptions {
    /** How to handle exceptions thrown during rule execution. */
    exceptionHandling?: 'failValidation' | 'succeedValidation'

    /** Regex patterns for field names that should be excluded from proxy observation. */
    excludedFields?: RegExp[]
    /** Base URL prepended to server validation endpoint paths. */
    baseUrl?: string

    /** Loads external parameters for a named validation set. */
    loadParameters?<TParameters = object>(validationSetName: string): Promise<TParameters>

    /** Sends a validation request to the server. */
    callServer?(url: string, method: string, data: any): Promise<DryvServerValidationResponse>

    /** Post-processes a rule's result before it is applied to the validator. */
    handleResult?<TModel extends object>(
        session: DryvValidationSession<TModel>,
        $m: TModel,
        field: keyof TModel,
        rule: DryvValidationRule<TModel>,
        result: any
    ): Promise<any>

    /** Parses a date string into a numeric timestamp. */
    parseDate?(date: string, locale: string, format: string): number

    /** Formats a value for display in validation messages. */
    format?(data: any, type: string, pattern?: string): string

    /** Registered rule set resolvers used by `dryvRuleSet()`. */
    ruleSetResolvers?: DryvValidationRuleSetResolver[]

    /** Called during options initialization to provide additional overrides. */
    setup?(): Partial<DryvOptions> | undefined | null
}

/**
 * Input options interface — allows optional fields for user-facing configuration.
 */
export interface DryvOptions extends Partial<DryvRequiredOptions>, DryvPluggableOptions {
    reactiveWrapper<TObject>(object: TObject): TObject
    validationTrigger?: ValidationTriggerName
}

/**
 * Fully-resolved options — all defaults are applied and no fields are undefined.
 * Returned by `dryvOptions()`. Eliminates the need for `!` non-null assertions.
 */
export type ResolvedDryvOptions = Required<DryvRequiredOptions> & Required<Pick<DryvPluggableOptions,
    'parseDate' | 'format' | 'callServer' | 'handleResult'
>> & DryvPluggableOptions
