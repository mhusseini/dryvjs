import type {
    DryvObject,
    DryvProxy,
    DryvProxyOptions,
    DryvInternalObject, DryvValidationRuleSet
} from "@/dryv";
import {
    dryvProxy,
    isDryvProxy,
    isDryvFieldValue,
    DryvValidatableObject,
    DryvValidatableValue
} from "@/dryv";

export function dryvProxyHandler<TModel extends object>(options: DryvProxyOptions, field?: string, ruleSet: DryvValidationRuleSet<TModel>): ProxyHandler<TModel> {
    let _dryv: DryvObject<TModel> = null;
    const fieldName = field?.toString();

    return {
        get(target: TModel, field: string, receiver: any): any {
            if (field === "$dryv") {
                return dryv();
            }

            if (options.excludedFields?.find(regexp => regexp?.test(fieldName))) {
                return Reflect.get(target, field, receiver);
            }

            const originalValue = Reflect.get(target, field, receiver);
            let resultValue = originalValue;

            if (typeof originalValue === "function") {
                // nop
            } else if (typeof originalValue === "object") {
                resultValue = ensureObjectProxy(originalValue, field);
                if (resultValue !== originalValue) {
                    Reflect.set(target, field, resultValue, receiver);
                }
            } else {
                ensureValueProxy(field);
            }

            return resultValue;
        },

        set(target: TModel, field: string, value: any, receiver: any): boolean {
            if (field === "$dryv") {
                throw new Error("The $dryv property is read-only.");
            }

            const fieldName = `${field}`;

            if (options.excludedFields?.find(regexp => regexp?.test(fieldName))) {
                return Reflect.set(target, field, value, receiver);
            }

            const originalValue = Reflect.get(target, field, receiver);
            let targetValue = value;

            if (typeof value === "function") {
                return Reflect.set(target, field, value, receiver);
            }

            if (!value && isDryvProxy(originalValue)) {
                originalValue.$dryv.parent = undefined;
            }

            if (typeof value === "object") {
                targetValue = ensureObjectProxy(value, field);
            } else {
                const proxy = ensureValueProxy(field);
                targetValue = value;
            }

            return Reflect.set(target, field, targetValue, receiver);
        }
    }

    function ensureObjectProxy(value: any, field: string) {
        const dryvProxyInstance: DryvProxy<any> = !isDryvProxy(value)
            ? dryvProxy(value, options, field, ruleSet)
            : value;

        const dryv_ = dryv();
        dryv_.value[field] = dryvProxyInstance.$dryv.value;
        dryvProxyInstance.$dryv.parent = dryv_;

        return dryvProxyInstance;
    }

    function ensureValueProxy(field: string) {
        const dryv_ = dryv();
        const dryvObject = dryv_.value;

        if (isDryvFieldValue(dryvObject[field])) {
            return dryvObject[field];
        }

        return dryvObject[field] = options.objectWrapper(new DryvValidatableValue(
            options,
            field,
            ruleSet,
            dryv_,
            () => dryv_.value.$model?.[field],
            value => {
                if (dryv_.value.$model) {
                    dryv_.value.$model[field] = value;
                }
            }));
    }

    function dryv() {
        if (!_dryv) {
            _dryv = options.objectWrapper(new DryvValidatableObject(options, fieldName, ruleSet));
        }

        return _dryv;
    }
}