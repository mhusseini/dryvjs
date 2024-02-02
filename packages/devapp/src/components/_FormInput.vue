<template>
  <div>
    <label>
      {{ label }}
    </label>

    <input ref="input" :value="modelValue" @input="changed" />

    <div class="error" v-show="false">Some error?</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  label: string
}>()

const emit = defineEmits(['update:modelValue'])

function changed(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<style>
.error {
  color: red;
}
</style>
