import type { DryvFieldValidationResult, DryvValidationResult } from '@/types'

/**
 * Creates a successful (empty) validation result for a given path.
 *
 * @param path - The dot-notation path of the validator.
 * @returns A `DryvValidationResult` indicating success.
 */
export function successResult(path: string): DryvValidationResult {
    return {
        results: [],
        success: true,
        hasErrors: false,
        hasWarnings: false,
        hasNewWarnings: false,
        warningHash: null,
        path
    }
}

/**
 * Pipeline Stage 1: Normalizes raw validation results into a flat list with
 * lowercased types and paths propagated from parent results.
 *
 * @param results - The raw aggregated results to normalize.
 * @returns A flat array of field-level results.
 */
export function normalizeResults(results: DryvValidationResult[]): DryvFieldValidationResult[] {
    const fieldResults = results
        .filter(Boolean)
        .flatMap((r) => r.results.map((r2) => ({ ...r2, path: r.path })))

    for (const r of fieldResults) {
        r.type = r.type?.toLowerCase()
    }

    return fieldResults
}

/**
 * Pipeline Stage 2: Computes a hash of warning texts for deduplication.
 *
 * @param normalized - Normalized field results.
 * @returns A hex string hash of all warning texts.
 */
export function computeWarningHash(normalized: DryvFieldValidationResult[]): string {
    return hashCode(
        normalized
            .filter((r) => r.text && /warning/i.test(r.text!))
            .map((r) => r.text)
            .join()
    )
}

/**
 * Pipeline Stage 3: Builds the aggregate result from normalized results, hash, and previous hash.
 *
 * @param normalized - Normalized field results.
 * @param warningHash - The current warning hash.
 * @param previousWarningHash - The warning hash from the previous validation pass.
 * @returns An aggregate result object.
 */
export function buildAggregateResult(
    normalized: DryvFieldValidationResult[],
    warningHash: string,
    previousWarningHash: string | null | undefined
): {
    results: DryvFieldValidationResult[]
    hasErrors: boolean
    hasWarnings: boolean
    hasNewWarnings: boolean
    warningHash: string
    success: boolean
} {
    const hasWarnings = normalized.some((r) => r.text && r.type && /warning/i.test(r.type))
    const hasErrors = normalized.some((r) => r.text && r.type && /error/i.test(r.type))

    return {
        results: normalized,
        hasErrors,
        hasWarnings,
        hasNewWarnings: hasWarnings && warningHash !== previousWarningHash,
        warningHash,
        success: !hasErrors && !hasWarnings
    }
}

/**
 * Aggregates individual field results into a single object-level validation result.
 * Pure function — previousWarningHash is passed explicitly.
 * Composed from pipeline stages: normalizeResults → computeWarningHash → buildAggregateResult.
 *
 * @param results - Per-field validation results.
 * @param previousWarningHash - The warning hash from the previous validation pass.
 * @returns An aggregate result object.
 */
export function aggregateFieldResults(
    results: DryvValidationResult[],
    previousWarningHash: string | null | undefined
): {
    results: DryvFieldValidationResult[]
    hasErrors: boolean
    hasWarnings: boolean
    hasNewWarnings: boolean
    warningHash: string
    success: boolean
} {
    const normalized = normalizeResults(results)
    const warningHash = computeWarningHash(normalized)
    return buildAggregateResult(normalized, warningHash, previousWarningHash)
}

/**
 * Builds a structured `DryvValidationResult` from a field result.
 * Pure function — does not mutate any validator state.
 *
 * @param result - The field-level result (or `null` for success).
 * @param path - The dot-notation path of the field.
 * @returns A `DryvValidationResult` wrapping the field result.
 */
export function buildFieldResult(
    result: DryvFieldValidationResult | null,
    path: string
): DryvValidationResult {
    if (result) {
        const type = result.type?.toLowerCase()

        return type === 'success'
            ? successResult(path)
            : {
                results: [result],
                hasErrors: type === 'error',
                hasWarnings: type === 'warning',
                warningHash: type === 'warning' ? result.text : null,
                hasNewWarnings: undefined,
                success: type === 'success' || !type,
                path
            }
    } else {
        return successResult(path)
    }
}

/**
 * Simple string hash (FNV-style) used for warning deduplication.
 *
 * @param text - The string to hash.
 * @returns A hex string hash, or empty string if the input is empty.
 */
export function hashCode(text?: string): string {
    if (!text || text.length === 0) {
        return ''
    }

    let hash = 0

    for (let i = 0; i < text.length; i++) {
        const chr = text.charCodeAt(i)
        hash = (hash << 5) - hash + chr
        hash |= 0 // Convert to 32bit integer
    }

    return Math.abs(hash).toString(16)
}
