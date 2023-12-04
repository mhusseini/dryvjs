import type {DryvValidationRuleSet} from "./typings";
import {defaultDryvRuleSetResolvers} from "./defaultDryvOptions";

export function dryvRuleSet<TModel extends object>(ruleSetName: string): DryvValidationRuleSet<TModel> | undefined {
    for (let resolver of defaultDryvRuleSetResolvers) {
        const ruleSet = resolver.resolve(ruleSetName);
        if (ruleSet) {
            return ruleSet;
        }
    }
    return undefined;
}