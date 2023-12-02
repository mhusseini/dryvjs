import type {
    DryvObject,
    DryvValidatable,
    DryvValidationResult,
    DryvValidationResultStatus
} from "@/dryv/typings";
import type {DryvValidationSession} from "@/dryv/DryvValidationSession";

export class DryvValidatableObject<TModel extends object> implements DryvValidatable<TModel, DryvObject<TModel>> {
    _isDryvValidatable = true;
    private _value: DryvObject<TModel> = {
        $model: undefined
    };
    text?: string | null = null;
    group?: string | null = null;
    status: DryvValidationResultStatus | undefined;

    constructor(public readonly field?: string,
                public parent: DryvValidatable = undefined) {
    }

    get value(): DryvObject<TModel> {
        return this._value;
    }

    set value(_) {
        throw new Error("Cannot set value on DryvValidatableObject.")
    }

    async validate(session: DryvValidationSession<TModel>): Promise<DryvValidationResult | null> {
        return await session.validateObject(this);
    }

    get path(): string {
        return (this.parent?.path ? this.parent.path + "." : "") + (this.field ?? "");
    }
}