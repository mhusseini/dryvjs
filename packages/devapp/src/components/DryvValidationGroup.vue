<template>
  <div class="validation-group">
    <slot />
    <template v-for="group in groups" :key="group.name">
      <template v-for="{ type, texts } in group.results" :key="type">
        <Message
          v-for="(text, ti) in texts"
          :key="ti"
          :severity="type === 'error' ? 'error' : 'warn'"
          :closable="false"
          class="mt-2"
        >
          {{ text }}
        </Message>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import Message from 'primevue/message'
import { useDryvGroupSlot } from '@softwareproduction/dryvue'

const props = defineProps<{ groups?: string[] }>()
const groups = useDryvGroupSlot(props.groups!)
</script>
