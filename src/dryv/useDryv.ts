import type {
    DryvObject,
    DryvOptions,
    DryvValidatable,
    DryvValidationResult,
} from "@/dryv/typings";
import {DryvValidationSession} from "@/dryv/DryvValidationSession";
import {dryvProxy} from "@/dryv/DryvProxy";
import {useDryvOptions} from "@/dryv/useDryvOptions";
import {findDryvRuleSet} from "@/dryv/findDryvRuleSet";

export function useDryv<TModel extends object>(model: TModel, ruleSetName: string, options?: DryvOptions): {
    session: DryvValidationSession,
    model: TModel,
    result: DryvValidatable<TModel, DryvObject<TModel>>,
    bindingModel: DryvObject<TModel>,
    validate: () => Promise<DryvValidationResult>
} {
    options = useDryvOptions(options);

    const ruleSet = findDryvRuleSet(ruleSetName);
    const session = new DryvValidationSession(options, ruleSet);
    const proxy = dryvProxy<TModel>(model, options);

    return {
        session,
        model: proxy,
        result: proxy.$dryv,
        bindingModel: proxy.$dryv.value,
        validate: async () => await session.validateObject(proxy),
    };
}