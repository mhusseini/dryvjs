import type {
    DryvOptions,
    DryvValidatableObject,
    DryvValidationResult,
    DryvValidationRuleSet,
    DryvServerErrors,
    DryvServerValidationResponse
} from '@softwareproduction/dryvjs'
import {
    dryvOptions,
    dryvRuleSet,
    DryvObjectValidator,
    DryvValidationSession,
    DryvValidator
} from '@softwareproduction/dryvjs'
import {computed, isRef, watch, ref, type Ref} from 'vue'
import {useMappedField} from './useMappedField'
import {useMappedGroup} from './useMappedGroup'

export interface UseDryvResult<TModel extends object, TParameters = object> {
    session: DryvValidationSession<TModel>
    model: TModel
    options: DryvOptions
    parameters?: Ref<TParameters>
    validatable: DryvValidatableObject<TModel>
    valid: Ref<boolean>
    dirty: Ref<boolean>
    validate: () => Promise<DryvValidationResult>
    clear: () => void
    commit: () => void
    revert: () => void
    reset: () => void
    setValidationResult: (result: DryvServerValidationResponse | DryvServerErrors) => boolean

    useMappedField<TTo>(
        field: keyof TModel,
        mappedValue: Ref<TTo | undefined>
    ): DryvValidator<any, TTo>

    useMappedGroup<TTo>(groupName: string, field: Ref<TTo | undefined>): DryvValidator<any, TTo>
}

export function useDryv<TModel extends object, TParameters = object>(
    model: TModel | Ref<TModel | undefined>,
    ruleSetOrName: string | DryvValidationRuleSet<TModel, TParameters>,
    options?: DryvOptions
): UseDryvResult<TModel, TParameters> & Promise<UseDryvResult<TModel, TParameters>> {
    const o = dryvOptions(options)
    if (o.setup) {
        const localOptions = o.setup()
        if (localOptions) {
            Object.assign(o, localOptions)
        }
    }
    options = (o?.reactiveWrapper(o) ?? o) as DryvOptions

    const ruleSet = findRuleSet<TModel, TParameters>(ruleSetOrName)
    const session = new DryvValidationSession<TModel, TParameters>(options, ruleSet)
    let validator: DryvObjectValidator<TModel>

    if (isRef(model)) {
        if (!model.value) {
            throw new Error('The initial value of the model cannot be null or undefined.')
        }
        validator = new DryvObjectValidator<TModel>(model.value, session, undefined, options)
        watch(model, (newModel) => {
            if (newModel) {
                validator.value = newModel
            }
        })
    } else {
        validator = new DryvObjectValidator<TModel>(model, session, undefined, options)
    }

    const _parameters = ref<TParameters | undefined>(session.ruleSet.parameters as TParameters)
    const parameters = computed<TParameters>({
        get: () => _parameters.value,
        set: (newValue) => {
            _parameters.value = newValue
            session.ruleSet.parameters = newValue
        }
    })

    const result: UseDryvResult<TModel, TParameters> = {
        session,
        options,
        model: validator.proxy,
        parameters,
        validatable: validator.transparentProxy!,
        validate: async () => await validator.validate(),
        valid: computed(() => validator.isSuccess),
        dirty: computed(() => validator.isDirty),
        clear: () => validator.clear(),
        commit: () => validator.commit(),
        revert: () => validator.revert(),
        reset: () => {
            validator.commit()
            session.reset()
        },
        // updateModel: (newValues: TModel) => (validator.value = newValues),
        useMappedField: (field: any, mappedValue: any) =>
            useMappedField<any, any>(session, field, mappedValue),
        useMappedGroup: <TTo>(groupName: string, field: Ref<TTo | undefined>) =>
            useMappedGroup(session, groupName, field),
        setValidationResult: (result: DryvServerValidationResponse | DryvServerErrors) =>
            validator.setValidationResult(result)
    };

    const promise = ruleSet.parameters && Object.keys(ruleSet.parameters).length && options?.loadParameters ? options
        .loadParameters<TParameters>(ruleSet.name)
        .then((result) => (parameters.value = result))
        .then(() => result) : Promise.resolve(result);

    Object.assign(promise, result);

    return promise as UseDryvResult<TModel, TParameters> & Promise<UseDryvResult<TModel, TParameters>>
}

function findRuleSet<TModel extends object, TParameters = object>(
    ruleSet: string | DryvValidationRuleSet<TModel, TParameters>
): DryvValidationRuleSet<TModel, TParameters> {
    switch (typeof ruleSet) {
        case 'undefined':
            throw new Error(
                `The ruleSet parameter must be either a valid rule set name of a valid rule set.`
            )
        case 'string': {
            const ruleSetName = ruleSet
            const foundRuleSet = dryvRuleSet<TModel, TParameters>(ruleSetName)

            if (!foundRuleSet) {
                throw new Error(`Could not find a validation rule set with the name '${ruleSetName}'`)
            }

            return {...foundRuleSet}
        }
        default:
            return {...ruleSet}
    }
}
