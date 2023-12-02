<template>
  <div v-if="value">
    <label @click="$refs.input.focus()">
      {{ label }}
    </label>
    <input v-model="value.value" ref="input">
    <div v-show="value?.status === 'error'" class="error">
      {{ value?.text }}
    </div>
  </div>
</template>


<script setup lang="ts">
import type {DryvValidatableValue} from "@/dryv";
import {defineEmits, reactive, Ref, ref, watchEffect} from "vue";
import {isDryvValidatableValue} from "@/dryv/isDryvValidatableValue";
import type {DryvValidatable} from "@/dryv/typings";

const props = defineProps<{
  modelValue: string | DryvValidatableValue<any, string>,
  label: string,
}>();

const emit = defineEmits(['update:modelValue'])
const value = bindDryvProp(() => props.modelValue, emit);

function bindDryvProp<TModel extends object, T>(prop: () => (DryvValidatableValue<TModel, T> | T), emit: (event: any, ...args: any[]) => void, event: string = "update:modelValue"): Ref<DryvValidatable<TModel, T>> {
  const result = ref();

  watchEffect(() => {
    const modelValue = prop();
    result.value = isDryvValidatableValue(modelValue)
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
</script>

<style>
.error {
  color: red;
}
</style>