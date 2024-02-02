import type { DryvOptions, DryvValidationRuleSetResolver } from './typings'

class DryvOptionsSingleton {
  public static readonly Instance: DryvOptions = {
    objectWrapper: <TObject>(o: TObject) => o,
    validationTrigger: 'autoAfterManual',
    excludedFields: [/^_/, /^\$/, /^Symbol\(/, /^toJSON$/, /^toString/],
    callServer: async (url: string, method: string, data: any) => {
      if (data && /get/i.test(method)) {
        const query = Object.entries(data)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
          .join('&')
        const sep = url.indexOf('?') >= 0 ? '&' : '?'
        url = `${url}${sep}${query}`
        data = undefined
      }
      const response = await fetch(url, { method, body: data && JSON.stringify(data) })
      return await response.json()
    },
    valueOfDate: (date: string) => {
      return new Date(date).valueOf()
    }
  }

  public static readonly RuleSetResolvers: DryvValidationRuleSetResolver[] = []
}

export const defaultDryvOptions: DryvOptions = DryvOptionsSingleton.Instance
export const defaultDryvRuleSetResolvers: DryvValidationRuleSetResolver[] =
  DryvOptionsSingleton.RuleSetResolvers
