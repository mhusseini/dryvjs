<template>
  <div class="row">
    <label>{{ label }}<span v-if="value.required">*</span>: </label>
    <input ref="input" v-model="value.value" />
    <div class="error" v-show="value.hasError && !value.groupShown">{{ value.text }}</div>
  </div>
</template>

<script setup lang="ts">
import { type DryvValidatable, useDryvValueProp } from "dryvue";

const props = defineProps<{
  modelValue: string | DryvValidatable<any, string>
  label: string,
}>();

const emit = defineEmits(["update:modelValue"]);
const value = useDryvValueProp(emit, () => props.modelValue);
</script>

<style lang="scss" scoped>
.row {
  display: grid;
  gap: 0.5em;
  grid-template-columns: 1fr 2.5fr;

  ~ .row {
    margin-top: 0.67em;
  }

  .error {
    grid-column: 1 / -1;
  }
}
</style>
