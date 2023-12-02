import {DryvValidatableValue} from "@/dryv/DryvValidatableValue";

export function isDryvValidatableValue<TModel extends object, TValue>(model: TValue | DryvValidatableValue<TModel, TValue>): model is DryvValidatableValue<TModel,TValue> {
    return (model as DryvValidatableValue)?._isDryvValidatable;
}