import type {
    DryvObject,
    DryvValidatable,
    DryvValidationResult,
    DryvValidationSession
} from "./typings";

export function dryvValidatableObject<TModel extends object = any, TValue = any>(
    field: keyof TModel | undefined,
    parent: DryvValidatable | undefined,
    model: TModel): DryvValidatable<TModel, TValue> {
    let _value: DryvObject<TModel> = {
        $model: model
    };
    return {
        _isDryvValidatable: typeof true,
        field,
        text: null,
        group: null,
        status: null,
        get value(): TValue {
            return _value;
        },
        get parent(): DryvValidatable | undefined {
            return parent;
        },
        set parent(value: DryvValidatable | undefined) {
            parent = value;
        },
        async validate(session: DryvValidationSession<TModel>): Promise<DryvValidationResult<TModel> | null> {
            return await session.validateObject(this);
        },
        get path(): string {
            return (parent?.path ? parent.path + "." : "") + (field ? String(field) : "") ?? null;
        }
    } as any as DryvValidatable<TModel, TValue>;
}