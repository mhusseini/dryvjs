import type {App} from "vue";
import type {Plugin} from "@vue/runtime-core";
import {reactive} from "vue";
import type {DryvOptions, DryvValidationRuleSet} from "./types";
import {defaultDryvOptions, defaultDryvRuleSetResolvers} from "./config";

export const Dryv: Plugin<DryvOptions[]> = {
    install(app: App, ...options: DryvOptions[]) {
        const opts = Object.assign(defaultDryvOptions, {
                objectWrapper: o => reactive(o)
            },
            ...options);
    }
}

export const DryvStaticRuleSets: Plugin<DryvOptions[]> = {
    install(app: App, options?: {
        [key: string]: DryvValidationRuleSet<any>
    }) {
        const ruleSets = options ?
            Object.entries(options).reduce((acc, [key, value]) => {
                acc[key.toLowerCase()] = value;
                return acc;
            }, {})
            : {};

        defaultDryvRuleSetResolvers.push({
            name: "Static rule set resolver",
            resolve<TModel extends object, TParameters = object>(ruleSetName: string): DryvValidationRuleSet<TModel, TParameters> {
                return ruleSets[ruleSetName.toLowerCase()];
            }
        });
    }
}