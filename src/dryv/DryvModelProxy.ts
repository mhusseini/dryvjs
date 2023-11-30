import type {
    DryvInternalObject,
    DryvObject,
    DryvProxy,
    DryvProxyApi,
    DryvFieldValue,
    DryvValidationRuleSet
} from "@/dryv/typings";
import {dryvProxyHandler} from "@/dryv/DryvProxyHandler";
import {DryvValidatableValue} from "@/dryv/typings";

const defaultOptions: DryvProxyOptions = {
    objectWrapper: o => o,
    excludedFields: [/^_/, /^$/]
}

export function dryvProxy<TModel>(model: TModel | DryvProxy<TModel>, ruleSet: DryvValidationRuleSet<TModel>, options?: DryvProxyOptions, field?: string): DryvProxy<TModel> {
    if (isDryvProxy(model)) {
        return model;
    }

    options = Object.assign(defaultOptions, options);
    model = options.objectWrapper(model);
    const handler = dryvProxyHandler(options, field, ruleSet);
    const proxy = new Proxy(model, handler) as DryvProxy<TModel>;
    proxy.$dryv.value.$model = proxy;

    for (const prop in model) {
        if (options.excludedFields.find(regexp => regexp.test(prop))) {
            continue;
        }
        model[prop as keyof TModel] = proxy[prop as keyof TModel];
    }
    return proxy;
}

export function isDryvProxy<TModel>(model: TModel | DryvProxy<TModel>): model is DryvProxy<TModel> {
    return (model as DryvProxy<TModel>)?.$dryv;
}

export function isDryvFieldValue<TValue>(model: TValue | DryvFieldValue<TValue>): model is DryvFieldValue<TValue> {
    return model instanceof DryvValidatableValue<TModel>;
}

export interface DryvProxyOptions {
    exceptionHandling: "failValidation" | "succeedValidation";
    objectWrapper?: <TObject>(object: TObject) => TObject;
    excludedFields?: RegExp[];
}