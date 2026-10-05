import type { DryvOptions, DryvValidationRuleSet } from '@/types'

/**
 * Plain context object passed to rule `validate` functions.
 * Exposes only the operations a rule needs: `parseDate`, `format`,
 * `callServer`, and `parameter`.
 *
 * @typeParam TModel - The root model type.
 * @typeParam TParameters - The type of externally-loaded parameters.
 */
export interface DryvRuleContext<TModel extends object = any, TParameters = any> {
  /**
   * Sends a validation request to the server.
   * @param url - The endpoint URL.
   * @param method - The HTTP method (e.g. `'GET'`, `'POST'`).
   * @param data - The request payload.
   * @returns The server response.
   * @throws If `callServer` is not configured in options.
   */
  callServer(url: string, method: string, data: any): Promise<any>

  /**
   * Parses a date string into a numeric timestamp.
   * @param date - The date string to parse.
   * @param locale - The locale for parsing.
   * @param format - The expected date format.
   * @returns The parsed timestamp.
   */
  parseDate(date: string, locale: string, format: string): number

  /**
   * Formats a value for display in validation messages.
   * @param data - The value to format.
   * @param type - The format type identifier.
   * @param pattern - An optional format pattern.
   * @returns The formatted string.
   */
  format(data: any, type: string, pattern?: string): string

  /**
   * Retrieves an externally-loaded parameter by key.
   * @typeParam T - The expected parameter value type.
   * @param key - The parameter key.
   * @returns The parameter value.
   */
  parameter<T = unknown>(key: string): T
}

/**
 * Creates a plain context object for rule `validate` functions.
 *
 * @typeParam TModel - The root model type.
 * @typeParam TParameters - The type of externally-loaded parameters.
 * @param options - The resolved Dryv options.
 * @param ruleSet - The validation rule set (provides parameters).
 * @returns A plain object implementing {@link DryvRuleContext}.
 */
export function createRuleContext<TModel extends object = any, TParameters = any>(
  options: DryvOptions,
  ruleSet: DryvValidationRuleSet<TModel, TParameters>
): DryvRuleContext<TModel, TParameters> {
  return {
    callServer(url: string, method: string, data: any): Promise<any> {
      if (!options.callServer) {
        throw new Error('callServer option is not configured.')
      }
      return options.callServer(url, method, data)
    },
    parseDate(date: string, locale: string, format: string): number {
      return options.parseDate!(date, locale, format)
    },
    format(data: any, type: string, pattern?: string): string {
      return options.format!(data, type, pattern)
    },
    parameter<T = unknown>(key: string): T {
      return ruleSet.parameters?.[key as keyof TParameters] as T
    }
  }
}
