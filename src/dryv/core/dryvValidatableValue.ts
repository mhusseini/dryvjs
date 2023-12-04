import type {
    DryvValidatable,
    DryvValidationResult, 
    DryvValidationSession,
} from "./typings";

export function dryvValidatableValue<TModel extends object = any, TValue = any>(
    field: keyof TModel | undefined,
    parent: DryvValidatable | undefined,
    getter: () => TValue,
    setter: (value: TValue) => void): DryvValidatable<TModel, TValue> {
    return {
        _isDryvValidatable: typeof true,
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
            return (parent?.path ? parent.path + "." : "") + (field ? String(field) : "") ?? null;
        }
    } as any as DryvValidatable<TModel, TValue>;
}