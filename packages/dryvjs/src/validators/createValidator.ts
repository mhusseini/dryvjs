import type {DryvValidationSession} from '@/session/DryvValidationSession'
import type {DryvOptions} from '@/types'
import {DryvValidator} from './DryvValidator'
import {DryvFieldValidator} from './DryvFieldValidator'
import {DryvObjectValidator} from './DryvObjectValidator'
import {SpecialTypeWrapper} from '@/internal'

interface ValidatorStrategy {
    matches: (value: unknown) => boolean
    create: 'field' | 'object' | 'skip'
}

const strategies: ValidatorStrategy[] = [
    { matches: (v) => typeof v === 'function',         create: 'skip' },
    { matches: (v) => Array.isArray(v),                create: 'field' },
    { matches: (v) => SpecialTypeWrapper.isSpecialType(v), create: 'field' },
    { matches: (v) => v instanceof Object,             create: 'object' },
]

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
    field ??= '' as keyof TModel
    model ??= {[field]: value} as TModel

    const strategy = strategies.find((s) => s.matches(value))
    const action = strategy?.create ?? 'field'

    if (action === 'skip') {
        return null
    }

    const validator: DryvValidator = action === 'object'
        ? new DryvObjectValidator(SpecialTypeWrapper.wrap(value as object), session, parent, options, field)
        : new DryvFieldValidator<object>(
            model as object,
            session,
            parent,
            options,
            field as keyof object
        )

    const rules = session.ruleSet.validators[validator.path ?? '']
    validator.required = !!(rules && rules.find((rule) => !!rule.annotations?.required))

    return validator
}
