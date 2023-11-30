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

const {value} = defineProps<{
  label: string,
  value: DryvValidatableValue<string>
}>();
</script>

<style>
.error {
  color: red;
}
</style>