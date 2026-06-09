import type {
    DryvOptions,
    DryvValidationRuleSetResolver,
    DryvValidationRule
} from '@/types'
import type { DryvValidationSession } from '@/session/DryvValidationSession'

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
        _: DryvValidationSession<TModel>,
        __: TModel,
        ___: keyof TModel,
        ____: DryvValidationRule<TModel>,
        result: any
    ): Promise<any> {
        return Promise.resolve(result)
    }
}

export const defaultDryvRuleSetResolvers: DryvValidationRuleSetResolver[] = []
