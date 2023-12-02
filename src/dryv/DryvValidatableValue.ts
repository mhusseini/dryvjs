import type {
    DryvValidatable,
    DryvValidationResult,
    DryvValidationResultStatus
} from "@/dryv/typings";
import type {DryvValidationSession} from "@/dryv/DryvValidationSession";

export function dryvValidatableValue<TModel extends object = any, TValue = unknown>(field: string | undefined,
                                                                                    parent: DryvValidatable | undefined,
                                                                                    getter: () => TValue,
                                                                                    setter: (value: TValue) => void): DryvValidatable<TModel, TValue> {
    return {
        _isDryvValidatable: true,
        field,
        text: null,
        group: null,
        status: null,
        get value(): TValue {
            return getter();
        },
        set value(value: TValue) {
            setter(value);
        },
        get parent(): DryvValidatable | undefined {
            return parent;
        },
        set parent(value: DryvValidatable | undefined) {
            parent = value;
        },
        async validate(session: DryvValidationSession<TModel>): Promise<DryvValidationResult<TModel> | null> {
            return await session.validateField(this);
        },
        get path(): string {
            return (parent?.path ? parent.path + "." : "") + (field ?? "");
        }
    } as DryvValidatable<TModel, TValue>;
}

export class DryvValidatableValue<TModel extends object = any, TValue = unknown> implements DryvValidatable<TModel, TValue> {
    _isDryvValidatable: true = true;
    text?: string | null = null;
    group?: string | null = null;
    status: DryvValidationResultStatus | undefined;

    constructor(public readonly field: string | undefined,
                public parent: DryvValidatable | undefined,
                private getter: () => TValue,
                private setter: (value: TValue) => void) {
    }

    get value(): TValue {
        return this.getter();
    }

    set value(value: TValue) {
        this.setter(value);
    }

    async validate(session: DryvValidationSession<TModel>): Promise<DryvValidationResult<TModel> | null> {
        return await session.validateField(this);
    }

    get path(): string {
        return (this.parent?.path ? this.parent.path + "." : "") + (this.field ?? "");
    }
}