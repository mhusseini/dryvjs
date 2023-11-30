import type {
    DryvValidatable,
    DryvValidationResult,
    DryvValidationResultStatus
} from "@/dryv/typings";
import type {DryvValidationSession} from "@/dryv/DryvValidationSession";

export class DryvValidatableValue<TModel extends object, TValue = unknown> implements DryvValidatable<TModel, TValue> {
    isDryvValidatable = true;
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

    async validate(session: DryvValidationSession<TModel>): Promise<DryvValidationResult | null> {
        return await session.validateField(this);
    }

    get path(): string {
        return (this.parent?.path ? this.parent.path + "." : "") + (this.field ?? "");
    }
};