import type {DryvValidatable} from "./typings";

export function isDryvValidatable<TModel extends object, TValue>(model: TValue | DryvValidatable<TModel, TValue>): model is DryvValidatable<TModel,TValue> {
    return (model as DryvValidatable)?._isDryvValidatable;
}