import type {
    DryvProxy,
    DryvProxyOptions,
} from "@/dryv";
import {
    dryvProxy,
    isDryvProxy,
} from "@/dryv";
import {DryvValidatableObject} from "@/dryv/DryvValidatableObject";
import {DryvValidatableValue} from "@/dryv/DryvValidatableValue";
import {isDryvValidatableValue} from "@/dryv/IsDryvValidatableValue";

export function dryvProxyHandler<TModel extends object>(options: DryvProxyOptions, field?: string): ProxyHandler<TModel> {
    let _dryv: DryvValidatableObject<TModel> = null;
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
                ensureValueProxy(field);
                targetValue = value;
            }

            return Reflect.set(target, field, targetValue, receiver);
        }
    }

    function ensureObjectProxy(value: any, field: string) {
        const proxy: DryvProxy<any> = !isDryvProxy(value)
            ? dryvProxy(value, options, field)
            : value;

        const dryv_ = dryv();
        dryv_.value[field] = proxy.$dryv.value;
        proxy.$dryv.parent = dryv_;

        return proxy;
    }

    function ensureValueProxy(field: string) {
        const dryv_ = dryv();
        const dryvObject = dryv_.value;

        return isDryvValidatableValue(dryvObject[field])
            ? dryvObject[field]
            : (dryvObject[field] = options.objectWrapper(new DryvValidatableValue(
                field,
                dryv_,
                () => dryv_.value.$model?.[field],
                value => {
                    if (dryv_.value.$model) {
                        dryv_.value.$model[field] = value;
                    }
                })));
    }

    function dryv() {
        if (!_dryv) {
            _dryv = options.objectWrapper(new DryvValidatableObject(fieldName));
        }

        return _dryv;
    }
}