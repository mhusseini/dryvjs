import type {
    DryvObject,
    DryvOptions,
    DryvValidatable,
    DryvValidationResult,
    DryvValidationSession,
} from "./types";
import {dryvProxy, dryvValidationSession, dryvRuleSet, dryvOptions, annotate} from "./core";

export interface UseDryvResult<TModel extends object> {
    session: DryvValidationSession,
    model: TModel,
    result: DryvValidatable<TModel, DryvObject<TModel>>,
    bindingModel: DryvObject<TModel>,
    validate: () => Promise<DryvValidationResult<TModel>>
}

export function useDryv<TModel extends object>(model: TModel, ruleSetName: string, options?: DryvOptions): UseDryvResult<TModel> {
    options = dryvOptions(options);

    const ruleSet = dryvRuleSet(ruleSetName);
    const session = dryvValidationSession(options, ruleSet);
    const proxy = dryvProxy<TModel>(model, options);

    annotate(proxy, ruleSet, options);
    
    return {
        session,
        model: proxy,
        result: proxy.$dryv,
        bindingModel: proxy.$dryv.value,
        validate: async () => await session.validateObject(proxy),
    };
}