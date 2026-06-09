import type {DryvValidationSession} from '@/session/DryvValidationSession'
import type {DryvOptions} from '@/types'
import {DryvValidator} from './DryvValidator'
import {DryvFieldValidator} from './DryvFieldValidator'
import {DryvObjectValidator} from './DryvObjectValidator'
import {SpecialTypeWrapper} from '@/internal'

/**
 * Creates a child validator for a given field value.
 *
 * Note: For arrays, this returns a `DryvFieldValidator`. Actual array tracking
 * is handled by `DryvArrayValidator`, which is constructed separately inside
 * `DryvObjectValidator.updateModel` when a field value is an array.
 *
 * @typeParam TModel - The model type.
 * @param parent - The parent validator that owns the field.
 * @param value - The current value of the field.
 * @param model - The model object containing the field.
 * @param field - The property key of the field.
 * @param session - The current validation session.
 * @param options - Resolved options.
 * @returns A new validator for the field, or `null` if the value is a function.
 */
export function createChildValidator<TModel>(
    parent: DryvValidator,
    value: unknown,
    model: TModel | undefined,
    field: keyof TModel | undefined,
    session: DryvValidationSession,
    options: DryvOptions
): DryvValidator | null {
    if (typeof value === 'function') {
        return null
    }

    field ??= '' as keyof TModel
    model ??= {[field]: value} as TModel

    let validator: DryvValidator

    if (Array.isArray(value) || SpecialTypeWrapper.isSpecialType(value)) {
        validator = new DryvFieldValidator<object>(
            model as object,
            session,
            parent,
            options,
            field as keyof object
        )
    } else if (value instanceof Object) {
        validator = new DryvObjectValidator(SpecialTypeWrapper.wrap(value as object), session, parent, options, field)
    } else {
        validator = new DryvFieldValidator<object>(
            model as object,
            session,
            parent,
            options,
            field as keyof object
        )
    }

    const rules = session.ruleSet.validators[validator.path ?? '']
    validator.required = !!(rules && rules.find((rule) => !!rule.annotations?.required))

    return validator
}
