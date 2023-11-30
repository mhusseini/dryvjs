import {useDemoRuleSet} from "@/PersonalDataValidationRules";
import type {DryvValidationRuleSet} from "@/dryv/typings";

export function findDryvRuleSet<TModel extends object>(ruleSetName: string): DryvValidationRuleSet<TModel> {
    return useDemoRuleSet();
}