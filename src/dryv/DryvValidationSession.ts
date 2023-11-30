import type {
    DryvFieldValidationResult,
    DryvProxyOptions,
    DryvValidatable,
    DryvValidationResult,
    DryvValidationRule,
    DryvValidationRuleSet,
    DryvValidationSession,
    DryvProxy
} from "@/dryv/typings";
import {DryvValidatableObject} from "@/dryv/DryvValidatableObject";
import {DryvValidatableValue} from "@/dryv/DryvValidatableValue";
import {isDryvProxy} from "@/dryv/DryvProxy";

export class DryvValidationSession<TModel extends object> {
    dryv: {
        callServer?(url: string, method: string, data: any): Promise<any>;

        handleResult?(session: DryvValidationSession<TModel>, $m: TModel, field: keyof (TModel), rule: DryvValidationRule<TModel>, result: any): Promise<any>;

        valueOfDate?(date: string, locale: string, format: string): number;
    };

    constructor(private options: DryvProxyOptions, private ruleSet?: DryvValidationRuleSet<TModel>) {
        this.dryv = {
            callServer: options.callServer,
            handleResult: options.handleResult,
            valueOfDate: options.valueOfDate
        };
    }

    async validateObject(objOrProxy: DryvValidatableObject<TModel> | DryvProxy<TModel>): Promise<DryvValidationResult | null> {
        const obj = isDryvProxy(objOrProxy) ? objOrProxy.$dryv : objOrProxy;
        const results: DryvValidationResult[] = await Promise.all(Object.entries(obj.value)
            .filter(([key, value]) => (value as DryvValidatable)?.isDryvValidatable && !this.options.excludedFields.find(regexp => regexp.test(key)))
            .map(([_, value]) => (value as DryvValidatable).validate(this)));
        const fieldResults = results.filter(r => r).flatMap(r => r.results);
        const warnings = fieldResults.filter(r => r.status === "warning");
        const hasErrors = fieldResults.some(r => r.status === "error");

        obj.status = hasErrors
            ? "error"
            : warnings.length > 0
                ? "warning"
                : "success";

        return {
            results: fieldResults,
            hasErrors: hasErrors,
            hasWarnings: warnings.length > 0,
            warningHash: fieldResults.map(r => r.text).join("|")
        }
    }

    async validateField(field: DryvValidatableValue<TModel>, model?: TModel): Promise<DryvValidationResult | null> {
        if (!model) {
            model = this.getModel(field);
        }
        const result = await this.validateFieldCore(model, field);
        if (result) {
            field.status = result.status;
            field.text = result.text;
            field.group = result.group;

            return {
                results: [result],
                hasErrors: result.status === "error",
                hasWarnings: result.status === "warning",
                warningHash: result.status === "warning" ? result.text : null
            };
        } else {
            field.status = "success";
            field.text = null;
            field.group = null;

            return null;
        }
    }

    private async validateFieldCore(model: TModel, field: DryvValidatableValue<TModel>): Promise<DryvFieldValidationResult | null> | null {
        const fieldName = field?.field;
        if (!fieldName) {
            return null;
        }

        const validators = this.ruleSet?.validators?.[fieldName] as DryvValidationRule<TModel>[];
        if (!validators || validators.length <= 0) {
            return null;
        }

        const disablers = this.ruleSet?.disablers?.[fieldName] as DryvValidationRule<TModel>[];
        if (disablers && disablers.length > 0) {
            for (const rule of disablers) {
                if (await rule.validate(model, this)) {
                    return null;
                }
            }
        }

        let result: DryvFieldValidationResult;

        try {
            for (const rule of validators) {
                result = await rule.validate(model, this);
                if (result && result.status !== "success") {
                    break;
                }
            }
        } catch (error) {
            console.error(`DRYV: Error validating field '${fieldName}'`, error);
            if (this.options.exceptionHandling === "failValidation") {
                result = {
                    path: field.path,
                    status: "error",
                    text: "Validation failed.",
                    group: null
                };
            }
        }

        return result && result.status !== "success" ? result : null;
    };

    private getModel(parent: DryvValidatable<TModel>): DryvProxy<TModel> {
        while (parent.parent) {
            parent = parent.parent;
        }

        return parent.value.$model;
    }
}