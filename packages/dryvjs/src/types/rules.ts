import type { DryvValidationSession } from '@/session/DryvValidationSession'

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

export type DryvRuleInvocations<TModel extends object> = {
    [Property in keyof TModel]?: DryvValidationRule<TModel>[]
} & {
    [path: string]: DryvValidationRule<TModel>[]
}

export interface DryvValidationRuleSet<TModel extends object, TParameters = object> {
    name: string
    validators: DryvRuleInvocations<TModel>
    disablers?: DryvRuleInvocations<TModel>
    parameters?: TParameters
}

export interface DryvValidationRuleSetResolver {
    name: string

    resolve<TModel extends object, TParameters = object>(
        ruleSetName: string
    ): DryvValidationRuleSet<TModel, TParameters>
}

export interface DryvFieldValidationResult {
    path?: string | null
    type?: DryvValidationResultType
    text?: string | null
    group?: string | null
}

export type DryvValidationResultType = 'error' | 'warning' | 'success' | string
