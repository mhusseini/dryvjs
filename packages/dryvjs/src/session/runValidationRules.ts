import type {
  DryvFieldValidationResult,
  DryvOptions,
  DryvValidateFunctionResult,
  DryvValidationRule,
  IValidator
} from '@/types'
import type { DryvValidationSession } from './DryvValidationSession'
import { getValidatorByPath } from '@/internal'

/**
 * Executes a set of validation rules against a model field and returns the first
 * failing result, or null if all rules pass.
 *
 * This is a pure function (no hidden state) — all dependencies are explicit parameters.
 *
 * @typeParam TModel - The root model type.
 * @param rules - The ordered list of validation rules to execute.
 * @param model - The model instance to validate against.
 * @param validatable - The field validator being validated.
 * @param session - The current validation session.
 * @param options - Options controlling exception handling behavior.
 * @param validateRelatedField - Callback to trigger validation of related fields.
 * @returns The first failing result, or `null` if all rules pass.
 */
export async function runValidationRules<TModel extends object>(
    rules: DryvValidationRule<TModel>[],
    model: TModel,
    validatable: IValidator<TModel>,
    session: DryvValidationSession<TModel>,
    options: Pick<DryvOptions, 'exceptionHandling'>,
    validateRelatedField: (field: IValidator<TModel>, model: TModel) => void
): Promise<DryvFieldValidationResult | null> {
    let result: DryvValidateFunctionResult = null

    try {
        for (const rule of rules) {
            rule.related?.forEach((relatedField) => {
                if (!relatedField || relatedField === validatable.path) {
                    return
                }
                const field = getValidatorByPath(validatable.rootValidator, relatedField as string)
                if (!field) {
                    return
                }
                validateRelatedField(field, model)
            })
            const r = await rule.validate(model, session.ruleContext)
            if (!r || r === true) {
                // rule passed — continue to next
            } else if (typeof r === 'string') {
                result = {
                    path: validatable.path!,
                    type: 'error',
                    text: r,
                    group: rule.group
                }
                break
            } else if (r.type !== 'success') {
                result = r
                if (!result.group) {
                    result.group = rule.group
                }
                break
            }
        }
    } catch (error) {
        console.error(`DRYV: Error validating field '${String(validatable.field)}'`, error)
        if (options.exceptionHandling === 'failValidation') {
            result = {
                path: validatable.path!,
                type: 'error',
                text: 'Validation failed.',
                group: null
            }
        }
    }

    return result && result.type !== 'success' ? result : null
}


