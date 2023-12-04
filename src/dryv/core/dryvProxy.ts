import {dryvProxyHandler} from "./DryvProxyHandler";
import type {DryvOptions, DryvProxy} from "./typings";
import {defaultDryvOptions} from "./defaultDryvOptions";
import {isDryvProxy} from "./isDryvProxy";

export function dryvProxy<TModel extends object>(model: TModel | DryvProxy<TModel>, options: DryvOptions, field?: keyof TModel): DryvProxy<TModel> {
    if (!model) {
        throw new Error("The model cannot be null or undefined.");
    }

    if (isDryvProxy(model)) {
        return model;
    }

    options = Object.assign(defaultDryvOptions, options);
    model = options.objectWrapper(model);

    const handler = dryvProxyHandler(options, field);
    const proxy: DryvProxy<TModel> = new Proxy(model, handler);

    Object.keys(model)
        .filter(prop => !options.excludedFields?.find(regexp => regexp.test(prop)))
        .forEach(prop => proxy[prop as keyof TModel] = proxy[prop as keyof TModel]);

    return proxy;
}

