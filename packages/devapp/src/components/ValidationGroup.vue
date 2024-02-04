<template>
  <slot />
  <div v-for="group in groups">
    <div v-for="{status, texts} in group.results" :class="status">
      <div v-for="text in texts">{{ text }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDryvGroupSlot } from "dryvue";

const props = defineProps<{ groups?: string[] }>();
const groups = useDryvGroupSlot(props.groups);
</script>