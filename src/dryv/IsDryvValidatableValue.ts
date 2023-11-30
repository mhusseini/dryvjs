import {DryvValidatableValue} from "@/dryv/DryvValidatableValue";

export function isDryvValidatableValue<TValue>(model: TValue | DryvValidatableValue<TValue>): model is DryvValidatableValue<TValue> {
    return (model as DryvValidatableValue)?.isDryvValidatable;
}