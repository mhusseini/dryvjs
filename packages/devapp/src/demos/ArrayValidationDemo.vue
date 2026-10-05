<template>
  <div class="demo-section">
    <h2>Array &amp; Nested Validation</h2>
    <p class="text-gray-500 mb-4">
      Demonstrates validation of arrays with dot-notation paths like <code>attendees.name</code>.
      Each attendee row is independently validated.
    </p>

    <div class="card">
      <div class="flex flex-col gap-4">
        <ValidatingInputText v-model="validatable.eventName" label="Event Name" placeholder="Annual Conference" />

        <ValidatingInputText v-model="validatable.date" label="Date" type="date" />

        <Divider />

        <div class="flex items-center justify-between">
          <h3>Attendees</h3>
          <Button label="Add Attendee" icon="pi pi-plus" size="small" @click="addAttendee" />
        </div>

        <div class="flex flex-col gap-3">
          <Card v-for="(attendee, index) in validatable.attendees" :key="index">
            <template #content>
              <div class="flex gap-3 items-start">
                <div class="flex-1 flex flex-col gap-3">
                  <ValidatingInputText v-model="attendee.name" :label="`Name #${index + 1}`" placeholder="Jane Smith" />
                  <ValidatingInputText v-model="attendee.email" :label="`Email #${index + 1}`" placeholder="jane@example.com" />
                </div>
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
                  @click="removeAttendee(index)"
                  class="mt-6"
                />
              </div>
            </template>
          </Card>

          <Message v-if="validatable.attendees.length === 0" severity="info" :closable="false">
            No attendees added yet. Click "Add Attendee" to begin.
          </Message>
        </div>

        <Divider />

        <div class="flex gap-2 justify-end">
          <Button label="Validate Booking" icon="pi pi-check" @click="onValidate" />
        </div>
      </div>

      <div v-if="lastResult" class="mt-4">
        <Message :severity="lastResult.success ? 'success' : 'error'" :closable="false">
          {{ lastResult.success ? 'Booking confirmed!' : 'Please fix the errors above.' }}
        </Message>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import Message from 'primevue/message'
import ValidatingInputText from '@/components/ValidatingInputText.vue'
import { useDryv, type DryvValidationResult } from '@softwareproduction/dryvue'
import { eventBookingRules } from '@/rules/eventBookingRules'
import type { EventBooking } from '@/models'

const data = reactive<EventBooking>({
  eventName: '',
  date: '',
  attendees: [{ name: '', email: '' }]
})

const { validatable, validate } = useDryv(data, eventBookingRules)

const lastResult = ref<DryvValidationResult | null>(null)

function addAttendee() {
  validatable.attendees.push({ name: '', email: '' })
}

function removeAttendee(index: number) {
  validatable.attendees.splice(index, 1)
}

async function onValidate() {
  lastResult.value = await validate()
}
</script>
