import type { DryvFieldValidationResult, DryvValidationResultType } from './rules'

export interface DryvValidationResult {
    results: DryvFieldValidationResult[]
    success: boolean
    hasErrors: boolean
    hasWarnings: boolean
    hasNewWarnings: boolean | undefined | null
    warningHash: string | undefined | null
    path?: string | null
}

export interface DryvGroupValidationResult {
    name: string
    results: {
        type: DryvValidationResultType
        texts: string[]
    }[]
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
