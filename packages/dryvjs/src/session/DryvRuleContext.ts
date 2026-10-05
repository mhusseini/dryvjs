import type { DryvOptions, DryvValidationRule, DryvValidationRuleSet } from '@/types'
import type { DryvValidationSession } from './DryvValidationSession'

/**
 * Utility functions available to rule `validate` functions via the
 * `dryv` property of the context object.
 *
 * @typeParam TModel - The root model type.
 * @typeParam TParameters - The type of externally-loaded parameters.
 */
export interface DryvRuleContextDryv {
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
   * Post-processes a rule's result before it is applied to the validator.
   * @param session - The current validation session.
   * @param $m - The model instance.
   * @param field - The field being validated.
   * @param rule - The rule that produced the result.
   * @param result - The raw validation result.
   * @returns The (possibly transformed) result.
   */
  handleResult<TModel extends object>(
    session: DryvValidationSession<TModel>,
    $m: TModel,
    field: keyof TModel,
    rule: DryvValidationRule<TModel>,
    result: any
  ): Promise<any>
}

/**
 * Plain context object passed to rule `validate` functions.
 * Utility functions are exposed on the `dryv` property.
 *
 * @typeParam TModel - The root model type.
 * @typeParam TParameters - The type of externally-loaded parameters.
 */
export interface DryvRuleContext<TModel extends object = any, TParameters = any> {
  /** The validation rule set associated with this context. */
  ruleSet: DryvValidationRuleSet<TModel, TParameters>

  /** Dryv utility functions available to validation rules. */
  dryv: DryvRuleContextDryv

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
    ruleSet,
    dryv: {
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
      handleResult<TModel extends object>(
        session: DryvValidationSession<TModel>,
        $m: TModel,
        field: keyof TModel,
        rule: DryvValidationRule<TModel>,
        result: any
      ): Promise<any> {
        return options.handleResult!(session, $m, field, rule, result)
      }
    },
    parameter<T = unknown>(key: string): T {
      return ruleSet.parameters?.[key as keyof TParameters] as T
    }
  }
}
