import type {
    DryvOptions,
    DryvValidationRuleSetResolver,
    DryvValidationRule
} from '@/types'
import type { DryvValidationSession } from '@/session/DryvValidationSession'

/** Default options applied when no user overrides are provided. */
export const defaultDryvOptions: DryvOptions = {
    reactiveWrapper: <TObject>(o: TObject) => o,
    validationTrigger: 'autoAfterManual',
    excludedFields: [/^_/, /^\$/, /^Symbol\(/, /^toJSON$/, /^toString/],
    parseDate: (date: string) => {
        return new Date(date).valueOf()
    },
    format(data: any): string {
        return data?.toString() ?? ''
    },
    callServer: async (url: string, method: string, data: any) => {
        if (data && /get/i.test(method)) {
            const query = Object.entries(data)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
                .join('&')
            const sep = url.indexOf('?') >= 0 ? '&' : '?'
            url = `${url}${sep}${query}`
            data = undefined
        }
        const response = await fetch(url, {method, body: data && JSON.stringify(data)})
        return await response.json()
    },
    handleResult<TModel extends object>(
        _session: DryvValidationSession<TModel>,
        _model: TModel,
        _field: keyof TModel,
        _rule: DryvValidationRule<TModel>,
        result: any
    ): Promise<any> {
        return Promise.resolve(result)
    }
}

/** Default (empty) list of rule set resolvers. */
export const defaultDryvRuleSetResolvers: DryvValidationRuleSetResolver[] = []
