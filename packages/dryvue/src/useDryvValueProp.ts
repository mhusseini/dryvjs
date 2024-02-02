import type {Ref} from "vue";
import {ref, watchEffect} from "vue";
import  {type DryvValidatable, isDryvValidatable} from "dryvjs";

export function useDryvValueProp<TModel extends object, T>(emit: (event: any, ...args: any[]) => void,
                                                           prop: () => (DryvValidatable<TModel, T> | T),
                                                           event: string = "update:modelValue")
    : Ref<DryvValidatable<TModel, T>> {
    const result = ref();

    watchEffect(() => {
        const modelValue = prop();
        result.value = isDryvValidatable(modelValue)
            ? modelValue
            : {
                get value() {
                    return modelValue;
                },
                set value(newValue) {
                    emit(event as any, newValue);
                }
            };
    });

    return result;
}