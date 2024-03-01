<template>
  <div class="row">
    <label>
      {{ label }}
    </label>

    <input ref="input" v-model="validatable.value" />

    <div class="error" v-show="validatable.type === 'error'">
      {{ validatable.text }}
    </div>
  </div>
</template>

<script lang="ts">
import { toNative, Component, Vue, Prop } from 'vue-facing-decorator'
import { dryvValidatableMixin, type DryvValidatableMixin } from 'dryvue'
import type { DryvValidatable } from 'dryvjs'

@Component({
  mixins: [dryvValidatableMixin<string>()]
})
class OptionsApiFormInput extends Vue implements DryvValidatableMixin<string> {
  modelValue!: string | DryvValidatable<any, string>
  validatable!: DryvValidatable<any, string>

  @Prop()
  label: string = ''

  setup() {}
}

export default toNative(OptionsApiFormInput)
</script>

<style lang="scss">
.row {
  display: grid;
  gap: 0.5em;
  grid-template-columns: 1fr 2.5fr;

  ~ .row {
    margin-top: 0.67em;
  }

  .error {
    color: red;
    grid-column: 1 / -1;
  }
}
</style>
