<template>
  <form>
    <div :class="{ invalid: !valid }">
      <h2>Lieferadresse</h2>
      <validating-input v-model="validatable.lieferadresse.strasse" label="Straße" />
      <validating-input v-model="validatable.lieferadresse.hausnummer" label="Hausnummer" />
      <validating-input v-model="validatable.lieferadresse.postleitzahl" label="PLZ" />
      <validating-input v-model="validatable.lieferadresse.ort" label="Ort" />
      <h2>Rechnungsadresse</h2>
      <input type="checkbox" v-model="validatable.abweichendeRechnungsadresse" />
      <validating-input v-model="validatable.rechnungsadresse.vorname" label="Anrede" />
      <validating-input v-model="validatable.rechnungsadresse.vorname" label="Vorname" />
      <validating-input v-model="validatable.rechnungsadresse.nachname" label="Nachname" />
      <validating-input v-model="validatable.rechnungsadresse.strasse" label="Straße" />
      <validating-input v-model="validatable.rechnungsadresse.hausnummer" label="Hausnummer" />
      <validating-input v-model="validatable.rechnungsadresse.postleitzahl" label="PLZ" />
      <validating-input v-model="validatable.rechnungsadresse.ort" label="Ort" />
    </div>
    <div class="button-bar">
      <!--      <button @click.prevent="randomize">Randomize</button>-->
      <!--      <button @click.prevent="revert" :disabled="!dirty && valid">Revert</button>-->
      <button @click.prevent="validate">Validate</button>
      <!--      <button @click.prevent="send">Send</button>-->
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
import ValidatingInput from '@/components/ValidatingInput.vue'
import type { Lieferadresse, PersonalData } from '@/models'
import { computed, reactive, ref } from 'vue'
import { type DryvValidationResult, useDryv, useTransaction } from 'dryvue'
import { lieferadresseValidationRules } from '@/LieferadresseValidationRules'

let model: Lieferadresse = reactive({
  abweichendeRechnungsadresse: false,
  lieferadresse: {
    postleitzahl: null,
    ort: null,
    strasse: null,
    hausnummer: null
  },
  rechnungsadresse: {
    postleitzahl: null,
    ort: null,
    strasse: null,
    hausnummer: null,
    vorname: null,
    nachname: null,
    anrede: null
  }
})

const { validate, validatable } = useDryv(model, lieferadresseValidationRules)

// defineEmits()
//
// const result = ref<DryvValidationResult>()
// const { model, commit, dirty } = useTransaction(data)
// const {
//   validatable,
//   validate,
//   valid,
//   clear,
//   updateModel,
//   model: proxy
// } = useDryv(model, lieferadresseValidationRules)
//
// async function send() {
//   result.value = await validate()
//   if (!result.value.success) {
//     return
//   }
//   // const response: DryvServerValidationResponse =
//   //   validatable.vorname?.value === 'text'
//   //     ? {
//   //         success: false,
//   //         messages: {
//   //           vorname: {
//   //             text: 'Der Name ist kacke',
//   //             type: 'error'
//   //           }
//   //         }
//   //       }
//   //     : 'testtet'
//   //
//   // setValidationResult(response)
//   alert('yay')
// }
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
