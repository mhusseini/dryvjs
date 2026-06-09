import type {DryvValidationSession} from '@/DryvValidationSession'
import {DryvOptions} from '@/typings'
import {DryvValidator} from '@/DryvValidator'
import {DryvArrayValidator} from '@/DryvArrayValidator'
import {DryvFieldValidator} from '@/DryvFieldValidator'
import {DryvObjectValidator} from '@/DryvObjectValidator'
import {DryvCompositeValidator} from '@/DryvCompositeValidator'
import {SpecialTypeWrapper} from '@/internal'

export function createValidator<TModel>(
    parent: DryvCompositeValidator,
    value: any,
    model: TModel | undefined,
    field: keyof TModel | undefined,
    session: DryvValidationSession,
    options: DryvOptions
): DryvValidator | null {
    field ??= '' as keyof TModel
    model ??= {[field]: value} as any

    if (typeof value === 'function') {
        return null
    }

    const validator: DryvValidator = Array.isArray(value)
        //? new DryvArrayValidator(value, session, parent, options, field)
        ? createFieldValidator()
        : SpecialTypeWrapper.isSpecialType(value)
            ? createFieldValidator()
            : value instanceof Object
                ? new DryvObjectValidator(SpecialTypeWrapper.wrap(value), session, parent, options, field)
                : createFieldValidator();

    const rules = session.ruleSet.validators[validator.path ?? '']
    validator.required = !!(rules && rules.find((rule) => !!rule.annotations?.required))

    return validator

    function createFieldValidator() {
        return new DryvFieldValidator<object>(
            model as object,
            session,
            parent,
            options,
            field! as keyof object
        );
    }
}
