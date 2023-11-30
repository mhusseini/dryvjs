import type {
    DryvServerValidationCallback,
    DryvValidateFunc, DryvValidationSession,
    DryvValidationResult, DryvValidationRule,
    DryvValidationRuleSet
} from "@/dryv";
import {dryvProxy} from "@/dryv";


export function createValidationContext() {
    const ctx: DryvValidationSession<TModel> = {
        dryv: {
            async callServer(url: string, method: string, data: any): Promise<any> {
                if (data && /get/i.test(method)) {
                    const query = Object.entries(data)
                        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`, [])
                        .join("&");
                    const sep = url.indexOf("?") >= 0 ? "&" : "?";
                    url = `${url}${sep}${query}`;
                    data = undefined;
                }
                const response = await fetch(url, {method, body: data && JSON.stringify(data)});
                return await response.json();
            },
            valueOfDate(date: string, locale: string, format: string): number {
                return new Date(date).valueOf();
            },
        }
    };
    return ctx;
}

export function useDryvValidator<TModel extends object>(ruleSet: DryvValidationRuleSet<TModel>): DryvValidateFunc {
    return async (model: TModel, callback?: DryvServerValidationCallback) => {
        return await DryvValidateImplementation(ruleSet, model, callback);
    };
}

async function DryvValidateImplementation<TModel extends object>(
    ruleSet: DryvValidationRuleSet<TModel>,
    model: TModel,
    callback: DryvServerValidationCallback): Promise<DryvValidationResult<TModel>> {
    const modelProxy = dryvProxy(model);
    const validationModel = modelProxy.$dryv;


    const ctx = await createValidationContext();
    const results = {};

    for (const field in ruleSet.validators) {
        const rules = ruleSet.validators[field as keyof TModel];
        for (const rule of rules) {
            const result = await rule.validate(modelProxy, ctx);
            if (result?.type && result.type !== "success") {
                results[field] = result;
                break;
            }
        }
    }

    return results;
}