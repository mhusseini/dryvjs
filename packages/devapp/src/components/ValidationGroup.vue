<template>
  <div class="row">
    <slot />
    <div v-for="group in groups">
      <div v-for="{ type, texts } in group.results" :class="type">
        <div v-for="text in texts">{{ text }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDryvGroupSlot } from 'dryvue'

const props = defineProps<{ groups?: string[] }>()
const groups = useDryvGroupSlot(props.groups!)
</script>

<style lang="scss" scoped>
.row {
  display: grid;
  grid-template-columns: 1fr;

  ~ .row {
    margin-top: 0.67em;
  }
  .error {
    margin-top: 0.5em;
  }
}
</style>
