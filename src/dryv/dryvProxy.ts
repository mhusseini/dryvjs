import {dryvProxyHandler} from "@/dryv/DryvProxyHandler";
import type {DryvProxy, DryvOptions} from "@/dryv/typings";
import {defaultProxyOptions} from "@/dryv/DefaultProxyOptions";

export function dryvProxy<TModel>(model: TModel | DryvProxy<TModel>, options: DryvOptions, field?: string): DryvProxy<TModel> {
    if (isDryvProxy(model)) {
        return model;
    }

    options = Object.assign(defaultProxyOptions, options);
    model = options.objectWrapper(model);
    const handler = dryvProxyHandler(options, field);
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

export function isDryvProxy<TModel extends object>(model: any | DryvProxy<TModel>): model is DryvProxy<TModel> {
    return !!(model as DryvProxy<TModel>)?.$dryv;
}

