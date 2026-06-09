import type { DryvValidationSession } from '@/session/DryvValidationSession'
import type { DryvValidationRule, DryvValidationRuleSetResolver } from './rules'
import type { DryvServerValidationResponse } from './results'

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

    parseDate?(date: string, locale: string, format: string): number

    format?(data: any, type: string, pattern?: string): string

    validationTrigger?: 'immediate' | 'auto' | 'manual' | 'autoAfterManual'

    ruleSetResolvers?: DryvValidationRuleSetResolver[]

    setup?(): Partial<DryvOptions> | undefined | null
}
