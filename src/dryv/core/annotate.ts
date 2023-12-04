import type {DryvObject, DryvOptions, DryvProxy, DryvValidationRuleSet, DryvValidatable} from "./typings";
import {isDryvValidatable} from "./";

export function annotate<TModel>(model: DryvProxy<TModel>, ruleSet: DryvValidationRuleSet<TModel>, options: DryvOptions) {
    annotateObject<TModel>(model.$dryv, ruleSet, options);
}

function annotateObject<TModel>(dryv: DryvObject<TModel>, ruleSet: DryvValidationRuleSet<TModel>, options: DryvOptions) {
    const model = dryv.value;
    for (const key in model) {
        if (options.excludedFields?.find(regexp => regexp.test(key))) {
            continue;
        }

        const value = model[key];
        if (isDryvValidatable(value)) {
            annotateValidatable<TModel>(value, ruleSet, options);
        }

        if (typeof value === "object") {
            annotateObject<TModel>(value, ruleSet, options)
        }
    }
}

function annotateValidatable<TModel>(validatable: DryvValidatable<TModel>, ruleSet: DryvValidationRuleSet<TModel>) {
    validatable.required = ruleSet.validators?.[validatable.field]?.find(rule => rule.annotations?.required) ?? false;
}