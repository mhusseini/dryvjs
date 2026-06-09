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
