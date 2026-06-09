import type { DryvOptions, DryvValidationRuleSet } from '@/types'

export class DryvRuleContext<TModel extends object = any, TParameters = any> {
  constructor(
    private options: DryvOptions,
    private ruleSet: DryvValidationRuleSet<TModel, TParameters>
  ) {}

  callServer(url: string, method: string, data: any): Promise<any> {
    if (!this.options.callServer) {
      throw new Error('DryvRuleContext: callServer option is not configured.')
    }
    return this.options.callServer(url, method, data)
  }

  parseDate(date: string, locale: string, format: string): number {
    return this.options.parseDate!(date, locale, format)
  }

  format(data: any, type: string, pattern?: string): string {
    return this.options.format!(data, type, pattern)
  }

  parameter(key: string): any {
    return this.ruleSet.parameters?.[key as keyof TParameters]
  }
}
