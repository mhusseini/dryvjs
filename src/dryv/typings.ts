import {DryvValidatableValue} from "@/dryv/dryvValidatableValue";
import type {DryvValidationSession} from "@/dryv/DryvValidationSession";

export interface DryvValidationRule<TModel> {
    async?: boolean;
    annotations?: {
        required?: boolean,
        [key: string | symbol]: unknown
    };
    validate: ($m: TModel, session: DryvValidationSession<TModel>) => DryvFieldValidationResult | null | Promise<DryvFieldValidationResult | null>;
}

export type DrvvRuleInvocations<TModel> = {
    [Property in keyof TModel]: DryvValidationRule<TModel>[];
}

export interface DryvValidationRuleSet<TModel, TParameters = object> {
    validators: DrvvRuleInvocations<TModel>;
    disablers: DrvvRuleInvocations<TModel>;
    parameters: TParameters
}

export interface DryvValidationResult<TModel extends object> {
    results: DryvFieldValidationResult[];
    hasErrors: boolean;
    hasWarnings: boolean;
    warningHash: string | undefined | null;
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

export interface DryvValidatable<TModel extends object = any, TValue = unknown> {
    _isDryvValidatable: true;
    text?: string | null;
    path?: string | null;
    group?: string | null;
    status?: DryvValidationResultStatus;
    value: TValue;

    validate(session: DryvValidationSession<TModel>): Promise<DryvValidationResult<TModel> | null>;
}

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

export interface DryvOptions {
    exceptionHandling?: "failValidation" | "succeedValidation";
    objectWrapper?: <TObject>(object: TObject) => TObject;
    excludedFields?: RegExp[];

    callServer?(url: string, method: string, data: any): Promise<any>;

    handleResult?<TModel>(session: DryvValidationSession<TModel>, $m: TModel, field: keyof (TModel), rule: DryvValidationRule<TModel>, result: any): Promise<any>;

    valueOfDate?(date: string, locale: string, format: string): number;
}