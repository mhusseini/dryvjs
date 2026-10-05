import type { DryvOptions, DryvValidationRuleSet } from '@/types'

/**
 * Minimal context object passed to rule `validate` functions.
 * Decouples rules from the session and options by exposing only
 * the operations a rule needs.
 *
 * @typeParam TModel - The root model type.
 * @typeParam TParameters - The type of externally-loaded parameters.
 */
export class DryvRuleContext<TModel extends object = any, TParameters = any> {
  constructor(
    private options: DryvOptions,
    private ruleSet: DryvValidationRuleSet<TModel, TParameters>
  ) {}

  /**
   * Sends a validation request to the server.
   * @param url - The endpoint URL.
   * @param method - The HTTP method (e.g. `'GET'`, `'POST'`).
   * @param data - The request payload.
   * @returns The server response.
   * @throws If `callServer` is not configured in options.
   */
  callServer(url: string, method: string, data: any): Promise<any> {
    if (!this.options.callServer) {
      throw new Error('DryvRuleContext: callServer option is not configured.')
    }
    return this.options.callServer(url, method, data)
  }

  /**
   * Parses a date string into a numeric timestamp.
   * @param date - The date string to parse.
   * @param locale - The locale for parsing.
   * @param format - The expected date format.
   * @returns The parsed timestamp.
   */
  parseDate(date: string, locale: string, format: string): number {
    return this.options.parseDate!(date, locale, format)
  }

  /**
   * Formats a value for display in validation messages.
   * @param data - The value to format.
   * @param type - The format type identifier.
   * @param pattern - An optional format pattern.
   * @returns The formatted string.
   */
  format(data: any, type: string, pattern?: string): string {
    return this.options.format!(data, type, pattern)
  }

  /**
   * Retrieves an externally-loaded parameter by key.
   * @typeParam T - The expected parameter value type.
   * @param key - The parameter key.
   * @returns The parameter value.
   */
  parameter<T = unknown>(key: string): T {
    return this.ruleSet.parameters?.[key as keyof TParameters] as T
  }
}
