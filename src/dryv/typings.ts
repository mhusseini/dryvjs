import type {DryvProxyOptions} from "@/dryv/DryvModelProxy";

export interface DryvValidationSession<TModel> {
    dryv: {
        callServer?(url: string, method: string, data: any): Promise<any>;

        handleResult?($ctx: DryvValidationSession<TModel>, $m: TModel, field: keyof (TModel), rule: DryvValidationRule<TModel>, result: any): Promise<any>;

        valueOfDate?(date: string, locale: string, format: string): number;
    }
}

export interface DryvValidationRule<TModel> {
    async?: boolean;
    annotations?: {
        required?: boolean,
        [key: string | symbol]: unknown
    };
    validate: ($m: TModel, $ctx: DryvValidationSession<TModel>) => DryvFieldValidationResult | null | Promise<DryvFieldValidationResult | null>;
}

export type DrvvRuleInvocations<TModel> = {
    [Property in keyof TModel]: DryvValidationRule<TModel>[];
}

export interface DryvValidationRuleSet<TModel, TParameters = object> {
    validators: DrvvRuleInvocations<TModel>;
    disablers: DrvvRuleInvocations<TModel>;
    parameters: TParameters
}

declare function dryvServerValidationCallback<TModel>(context: DryvValidationSession<TModel>, model: TModel, path: string, rule: DryvValidationRule<TModel>, result: DryvFieldValidationResult): void;

export type DryvServerValidationCallback = typeof dryvServerValidationCallback;

declare function dryvValidateFunc<TModel extends object, TResultData = unknown>(model: TModel, callback?: DryvServerValidationCallback): Promise<DryvValidationResult<TModel, TResultData>>;

export type DryvValidateFunc = typeof dryvValidateFunc;

export interface DryvValidationResult<TModel extends object> {
    results: DryvFieldValidationResult[];
    hasErrors: boolean;
    hasWarnings: boolean;
    warningHash: string;
}

export interface DryvFieldValidationResult {
    path: string;
    status?: DryvValidationResultStatus;
    text?: string | null
    group?: string | null
}

export type DryvValidationResultStatus = "error" | "warning" | "success" | string;

export type DryvProxy<TModel extends object> = TModel & {
    $dryv: DryvValidatable<TModel, DryvObject<TModel>>
};

export type DryvObject<TModel extends object> = {
    [Property in keyof TModel]: TModel[Property] extends boolean
        ? DryvValidatableValue<TModel, TModel[Property]>
        : TModel[Property] extends string
            ? DryvValidatableValue<TModel, TModel[Property]>
            : TModel[Property] extends Date
                ? DryvValidatableValue<TModel, TModel[Property]>
                : TModel[Property] extends Array<infer ArrayType>
                    ? DryvValidatableValue<TModel, TModel[Property]>
                    : TModel[Property] extends object
                        ? DryvObject<TModel[Property]>
                        : TModel[Property] extends (object | undefined)
                            ? DryvObject<TModel[Property]>
                            : DryvValidatableValue<TModel, TModel[Property]>
} & {
    $model: DryvProxy<TModel>;
};

export abstract class DryvValidatable<TModel extends object, TValue = unknown> implements DryvFieldValidationResult {
    private _ruleSet?: DryvValidationRuleSet<TModel>;
    text?: string | null = null;
    group?: string | null = null;
    parent?: DryvValidatable = null;

    constructor(protected options: DryvProxyOptions,
                public field: string = undefined,
                ruleSet?: DryvValidationRuleSet<TModel> = undefined) {
        this._ruleSet = ruleSet;
    }

    abstract get status?(): DryvValidationResultStatus;

    abstract get value(): TValue;

    abstract validate($m: TModel, $ctx: DryvValidationSession<TModel>): DryvValidationResult | null | Promise<DryvValidationResult | null>;

    get model(): DryvProxy<TModel> {
        let parent = this;
        while (parent.parent) {
            parent = parent.parent;
        }

        return parent.value.$model;
    }

    get ruleSet(): DryvValidationRuleSet<TModel> {
        return this.parent?.ruleSet ?? this._ruleSet;
    }

    get path(): string {
        return (this.parent?.path ? this.parent.path + "." : "") + (this.field ?? "");
    }

    protected async validateField($ctx: DryvValidationSession<TModel>): Promise<DryvFieldValidationResult> | null | undefined {
        if (!this.field) {
            return null;
        }
        
        const validators = this.ruleSet?.validators?.[this.field] as DryvValidationRule<TModel>[];
        if (!validators || validators.length <= 0) {
            return null;
        }

        const disablers = this.ruleSet?.disablers?.[this.field] as DryvValidationRule<TModel>[];
        if (disablers && disablers.length > 0) {
            for (const rule of disablers) {
                if (await rule.validate(this.model, $ctx)) {
                    return null;
                }
            }
        }

        let result: DryvFieldValidationResult;

        try {
            for (const rule of validators) {
                result = await rule.validate(this.model, $ctx);
                if (result && result.status !== "success") {
                    break;
                }
            }
        } catch (error) {
            console.error("DRYV: Error validating field " + this.path, error);
            if (this.options.exceptionHandling === "failValidation") {
                result = {
                    path: this.path,
                    status: "error",
                    text: "Validation failed.",
                    group: null
                };
            }
        }

        return result && result.status !== "success" ? result : null;

    }
}

export class DryvValidatableObject<TModel extends object> extends DryvValidatable<TModel, DryvObject<TModel>> {
    private _value: DryvObject<TModel>;

    constructor(options: DryvProxyOptions,
                field?: string,
                parent?: DryvValidatable = undefined,
                ruleSet?: DryvValidationRuleSet<TModel> = undefined) {
        super(options, field, parent, ruleSet);
        this._value = {
            $model: undefined
        };
    }

    get value(): DryvObject<TModel> {
        return this._value;
    }

    set value(_): void {
        throw new Error("Cannot set value on DryvValidatableObject.")
    }

    async validate($ctx?: DryvValidationSession<TModel>): DryvValidationResult | null | Promise<DryvValidationResult | null> {
        const results: DryvValidationResult[] = await Promise.all(Object.entries(this.value)
            .filter(([key, value]) => value instanceof DryvValidatable && !this.options.excludedFields.find(regexp => regexp.test(key)))
            .map(([_, value]) => (value as DryvValidatable).validate($ctx)));
        const fieldResults = results.filter(r => r).flatMap(r => r.results);
        const warnings = fieldResults.filter(r => r.status === "warning");
        const hasErrors = fieldResults.some(r => r.status === "error");

        this.status = hasErrors
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
}

export class DryvValidatableValue<TModel extends object, TValue = unknown> extends DryvValidatable<TModel, TValue> {
    private _status?: DryvValidationResultStatus;

    constructor(options: DryvProxyOptions,
                field: keyof TModel,
                ruleSet?: DryvValidationRuleSet<TModel> = undefined,
                parent?: DryvValidatable = undefined,
                private getter: () => TValue,
                private setter: (value: TValue) => void) {
        super(options, field, ruleSet);
        this.parent = parent;
    }

    get value(): TValue {
        return this.getter();
    }

    set value(value: TValue): void {
        this.setter(value);
    }

    get status(): DryvValidationResultStatus {
        return this._status;
    }

    set status(value: DryvValidationResultStatus): void {
        this._status = value;
    }

    async validate($ctx: DryvValidationSession<TModel>): DryvValidationResult | null | Promise<DryvValidationResult | null> {
        const result = await this.validateField($ctx);
        if (result) {
            this.status = result.status;
            this.text = result.text;
            this.group = result.group;

            return {
                results: [result],
                hasErrors: result.status === "error",
                hasWarnings: result.status === "warning",
                warningHash: result.status === "warning" ? result.text : null
            };
        } else {
            this.status = "success";
            this.text = null;
            this.group = null;

            return null;
        }
    }
}