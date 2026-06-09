import type { DryvFieldValidationResult, DryvValidationResult, IValidator } from '@/types'

/**
 * Creates a successful (empty) validation result for a given path.
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
 * Aggregates individual field results into a single object-level validation result.
 * Pure function — previousWarningHash is passed explicitly.
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
    const fieldResults = results
        .filter(Boolean)
        .flatMap((r) => r.results.map((r2) => ({ ...r2, path: r.path })))

    for (const r of fieldResults) {
        r.type = r.type?.toLowerCase()
    }

    const hasWarnings = fieldResults.some((r) => r.text && r.type && /warning/i.test(r.type))
    const hasErrors = fieldResults.some((r) => r.text && r.type && /error/i.test(r.type))
    const warningHash = hashCode(
        fieldResults
            .filter((r) => r.text && /warning/i.test(r.text))
            .map((r) => r.text)
            .join()
    )

    return {
        results: fieldResults,
        hasErrors,
        hasWarnings,
        hasNewWarnings: hasWarnings && warningHash !== previousWarningHash,
        warningHash,
        success: !hasErrors && !hasWarnings
    }
}

/**
 * Applies a field validation result to a validator (side-effect) and returns
 * a structured `DryvValidationResult`.
 */
export function applyFieldResult(
    result: DryvFieldValidationResult | null,
    field: IValidator
): DryvValidationResult {
    if (result) {
        field.type = result.type ?? 'success'
        field.text = result.text ?? null
        field.group = result.group ?? null

        const type = result.type?.toLowerCase()

        return type === 'success'
            ? successResult(field.path!)
            : {
                results: [result],
                hasErrors: type === 'error',
                hasWarnings: type === 'warning',
                warningHash: type === 'warning' ? result.text : null,
                hasNewWarnings: undefined,
                success: type === 'success' || !type,
                path: String(field.path)
            }
    } else {
        field.type = 'success'
        field.text = null
        field.group = null

        return successResult(field.path!)
    }
}

/**
 * Simple string hash (FNV-style) used for warning deduplication.
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
