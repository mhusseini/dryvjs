<template>
  <form>
    <div :class="{ invalid: !valid }">
      <fieldset>
        <validating-input v-model="validatable.name" label="Name" />
        <validating-files v-model="validatable.items" label="Files" />
        <pre>{{validatable.items}}</pre>
      </fieldset>
    </div>
    <div class="button-bar">
      <button @click.prevent="validate">Validate</button>
      <button @click.prevent="commit" :disabled="!dirty || !valid">Commit</button>
      <button @click.prevent="revert" :disabled="!dirty">Revert</button>
      <!--      <button @click.prevent="validatable.people.attendees!.pop()">Pop</button>-->
      <!--      <button @click.prevent="validatable.people.attendees!.push({ name: 'a' })">Append</button>-->
      <!--      <button @click.prevent="validatable.people.attendees!.unshift({ name: 'b' })">Insert</button>-->
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
import ValidatingFiles from '@/components/ValidatingFiles.vue'
import { reactive } from 'vue'
import { useDryv } from 'dryvue'

interface DataItem {
  name?: string
}

interface FormData {
  name?: string
  items?: DataItem[]
}

const data: FormData = reactive<FormData>({
  name: '',
  items: []
})

const { model, validate, validatable, valid, dirty, commit, revert, setValidationResult } = useDryv(
  data,
  {
    validators: {
      items: [
        {
          annotations: {
            required: true
          },
          validate: function ($m: FormData) {
            return !$m.items?.some(s => s.name?.includes('super'))
              ? {
                  type: 'error',
                  text: 'At least on super item is required',
                }
              : null
          }
        }
      ],
    }
  } as DryvValidationRuleSet<FormData>
)

setValidationResult('')

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
