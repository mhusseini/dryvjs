import type { DryvFieldValidationResult, DryvValidationResultType } from './rules'

/** Aggregated validation result for a validator node and its descendants. */
export interface DryvValidationResult {
    /** Individual field-level results contributing to this aggregate. */
    results: DryvFieldValidationResult[]
    /** `true` if no errors or warnings were found. */
    success: boolean
    /** `true` if at least one result has type `'error'`. */
    hasErrors: boolean
    /** `true` if at least one result has type `'warning'`. */
    hasWarnings: boolean
    /** `true` if warnings changed since the previous validation pass. */
    hasNewWarnings: boolean | undefined | null
    /** Hash of warning texts used for deduplication across validation passes. */
    warningHash: string | undefined | null
    /** Dot-notation path of the validator that produced this result. */
    path?: string | null
}

/** Validation results grouped by their validation group name. */
export interface DryvGroupValidationResult {
    /** The group name. */
    name: string
    /** Per-type result entries within this group. */
    results: {
        /** The result severity type. */
        type: DryvValidationResultType
        /** Validation message texts for this type. */
        texts: string[]
    }[]
}

/**
 * Response shape returned by a server-side validation endpoint.
 * Either a structured response with a `success` flag and `messages` map,
 * or a flat record of field path to validation result.
 */
export type DryvServerValidationResponse =
    | { success: boolean; messages: DryvServerErrors }
    | Record<string, DryvFieldValidationResult>

/** Map of field paths to their server-reported validation results. */
export interface DryvServerErrors {
    [field: string]: DryvFieldValidationResult
}

/**
 * Type guard that distinguishes a structured server response (with `success` flag)
 * from a flat error record.
 */
export function isStructuredResponse(r: unknown): r is { success: boolean; messages: DryvServerErrors } {
    return typeof (r as any)?.success === 'boolean'
}
