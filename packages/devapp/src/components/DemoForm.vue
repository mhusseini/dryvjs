<template>
  <form>
    <div :class="{ invalid: !valid }">
      <fieldset>
        <legend>Files</legend>
        <validating-input v-model="validatable.name" label="Name" />
        <input type="file" multiple @change="validatable.test = ($event.target as any)!.files" />
        <input type="file" multiple @change="validatable.file = ($event.target as any)!.files[0]" />
        <input type="file" multiple @change="validatable.files = ($event.target as any)!.files" />
        <div class="error" v-show="validatable.file?.hasErrors && !validatable.file?.groupShown">
          {{ validatable.file?.text }}
        </div>
        <div v-for="file in validatable.files" :key="file.value.name">
          <span>{{ file.value.name }}</span>
        </div>
        <div class="error">
          {{ validatable.files.$validator.text }}
        </div>
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
import type { Course, Lieferadresse } from '@/models'
import { reactive } from 'vue'
import { useDryv } from 'dryvue'
//import { courseValidationRules } from '@/CourseValidationRules'
import { lieferadresseValidationRules } from '@/LieferadresseValidationRules'
import ValidationGroup from '@/components/ValidationGroup.vue'
import type { DryvValidationRuleSet } from 'dryvjs'

// const attendees = reactive(
//   [1, 2, 3, 4].map((_) => ({
//     name: null
//     // email: null,
//     // phone: null
//   }))
// )
// let data = reactive({
//   name: null,
//   people: {
//     attendees
//   }
// }) as any as Course

interface FormData {
  name?: string
  file?: File | null
  files?: File[] | null
  test?: FileList
}

const data: FormData = reactive<FormData>({
  name: '',
  file: null,
  files: []
})

const x: FormData;
x.files?.find(f => f.type)

const { model, validate, validatable, valid, dirty, commit, revert, setValidationResult } = useDryv(
  data,
  {
    validators: {
      name: [
        {
          validate: function ($m: FormData) {
            return !$m.name
              ? {
                  type: 'error',
                  text: 'Der Name darf nicht leer sein'
                }
              : null
          }
        }
      ],
      file: [
        {
          annotations: {
            required: true
          },
          validate: function ($m: FormData) {
            return !$m.file
              ? {
                  type: 'error',
                  text: 'Bitte eine Datei auswählen'
                }
              : null
          }
        }
      ],
      files: [
        {
          annotations: {
            required: true
          },
          validate: function ($m: FormData) {
            return $m.files.reduce((acc, cur) => acc + cur.size, 0) > 10
              ? {
                  type: 'error',
                  text: 'Die Dateien sind zu groß'
                }
              : null
          }
        }
      ]
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
