import type {
    DryvProxy,
    DryvOptions,
    DryvValidatable,
} from "./typings";
import {
    dryvProxy,
    isDryvProxy,
} from ".";
import {isDryvValidatable} from "./isDryvValidatableValue";
import {dryvValidatableObject} from "./dryvValidatableObject";
import {dryvValidatableValue} from "./dryvValidatableValue";

export function dryvProxyHandler<TModel extends object>(options: DryvOptions, field?: string): ProxyHandler<TModel> {
    const _excludedFields: { [field: string]: boolean } = {};
    let _dryv: DryvValidatable<TModel> | null = null;

    return {
        get(target: TModel, field: string | keyof TModel, receiver: any): any {

            const fieldName = String(field);
            if (fieldName === "$dryv") {
                return getDryv(receiver);
            }

            if (isExcludedField(fieldName)) {
                return Reflect.get(target, field, receiver);
            }

            const originalValue = Reflect.get(target, field, receiver);
            let resultValue = originalValue;

            if (typeof originalValue === "object") {
                resultValue = ensureObjectProxy(originalValue, field, receiver);
                if (resultValue !== originalValue) {
                    Reflect.set(target, field, resultValue, receiver);
                }
            } else if (typeof originalValue !== "function") {
                ensureValueProxy(field, target, receiver);
            }

            return resultValue;
        },

        set(target: TModel, field: string | keyof TModel, value: any, receiver: any): boolean {
            const fieldName = field?.toString();
            if (fieldName === "$dryv") {
                throw new Error("The $dryv property is read-only.");
            }

            if (typeof value === "function") {
                return Reflect.set(target, field, value, receiver);
            }

            if (isExcludedField(fieldName)) {
                return Reflect.set(target, field, value, receiver);
            }

            const originalValue = Reflect.get(target, field, receiver);


            if (!value && isDryvProxy(originalValue)) {
                originalValue.$dryv.parent = undefined;
            }

            let targetValue;

            if (typeof value === "object") {
                targetValue = ensureObjectProxy(value, field, receiver);
            } else {
                ensureValueProxy(field, target, receiver);
                targetValue = value;
            }

            return Reflect.set(target, field, targetValue, receiver);
        }
    }

    function ensureObjectProxy(value: any, field: keyof TModel, target: TModel) {
        const proxy: DryvProxy<any> = !isDryvProxy(value)
            ? dryvProxy(value, options, field)
            : value;

        const dryv = getDryv(target);
        dryv.value[field] = proxy.$dryv.value;
        proxy.$dryv.parent = dryv;

        return proxy;
    }

    function ensureValueProxy(field: keyof TModel, target: TModel, receiver: TModel) {
        const dryv = getDryv(receiver);
        const dryvObject = dryv.value;

        if (isDryvValidatable(dryvObject[field])) {
            return dryvObject[field];
        } else {
            const proxy = options.objectWrapper!(factory())
            dryvObject[field] = proxy;
            return proxy;
        }

        function factory() {
            return dryvValidatableValue(
                field,
                dryv,
                () => target[field],
                value => target[field] = value
            );
        }
    }

    function getDryv(model: TModel) {
        if (!_dryv) {
            _dryv = options.objectWrapper!(factory());
        }

        return _dryv;

        function factory() {
            return dryvValidatableObject<TModel>(field, undefined, model);
        }
    }

    function isExcludedField(field: string) {
        if (_excludedFields[field] === undefined) {
            _excludedFields[field] = !!options.excludedFields?.find(regexp => regexp?.test(field));
        }

        return _excludedFields[field];
    }
}