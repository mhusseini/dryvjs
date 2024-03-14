<template>
  <form>
    <div :class="{ invalid: !valid }">
      <validating-input v-model="validatable.anrede" label="Anrede" />
      <validating-input v-model="validatable.vorname" label="Vorname" />
      <validating-input v-model="validatable.nachname" label="Nachname" />
      <validating-input v-model="validatable.child!.child!.nachname" label="Nachname" />
    </div>
    <div class="button-bar">
      <button @click.prevent="randomize">Randomize</button>
      <button @click.prevent="revert" :disabled="!dirty && valid">Revert</button>
      <button @click.prevent="validate">Validate</button>
      <button @click.prevent="send">Send</button>
    </div>
  </form>
  <table>
    <tr>
      <td>
        <pre class="debug"> {{ validatable }} </pre>
      </td>
      <td>
        <pre class="debug"> {{ model }} </pre>
      </td>
    </tr>
  </table>
</template>

<script setup lang="ts">
import ValidatingInput from '@/components/ValidatingInputOptionsApi.vue'
import type { PersonalData } from '@/models'
import { reactive, ref } from 'vue'
import { type DryvValidationResult, useDryv, useTransaction } from 'dryvue'
import { personalDataValidationRules } from '@/PersonalDataValidationRules'

let data: PersonalData = reactive({
  anrede: 'text',
  vorname: 'text',
  nachname: 'text',
  child: {
    anrede: 'text2',
    vorname: 'text2',
    nachname: 'text2',
    child: {
      anrede: 'text3',
      vorname: 'text3',
      nachname: 'text3'
    },
    location: {
      street: 'street1',
      city: 'city1',
      zip: 'zip1'
    }
  }
})

defineEmits()

const result = ref<DryvValidationResult>()
const { model, rollback, dirty } = useTransaction(data)
const { validatable, validate, valid, clear, updateModel } = useDryv(
  model,
  personalDataValidationRules
)

function revert() {
  rollback()
  clear()
}

async function send() {
  result.value = await validate()
  if (!result.value.success) {
    return
  }
  // const response: DryvServerValidationResponse =
  //   validatable.vorname?.value === 'text'
  //     ? {
  //         success: false,
  //         messages: {
  //           vorname: {
  //             text: 'Der Name ist kacke',
  //             type: 'error'
  //           }
  //         }
  //       }
  //     : 'testtet'
  //
  // setValidationResult(response)
  alert('yay')
}

function randomize() {
  updateModel({
    anrede: 'Herr',
    vorname: 'Max',
    nachname: 'Mustermann',
    child: {
      anrede: 'Frau',
      vorname: 'Erika',
      nachname: 'Musterfrau'
    }
  })
}
</script>

<style lang="scss">
.invalid {
  background-color: #ff000022;
}

.button-bar {
  display: flex;
  justify-content: flex-end;
  padding: 1em 0;

  button {
    padding: 0.67em;
  }
}

.debug {
  font-size: small;
  background-color: #292929;
  padding: 1em;
}
</style>
