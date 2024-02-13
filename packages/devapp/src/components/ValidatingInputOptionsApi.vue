<template>
  <div class="row">
    <label>
      {{ label }}
    </label>

    <input ref="input" v-model="value.value" />

    <div class="error" v-show="value?.status === 'error'">
      {{ value?.text }}
    </div>
  </div>
</template>

<script lang="ts">
import { toNative, Component, Vue, Prop } from 'vue-facing-decorator'
import { dryvValuePropMixin } from 'dryvue'

@Component({
  mixins: [dryvValuePropMixin<string>()]
})
class OptionsApiFormInput extends Vue {
  @Prop()
  label: string
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
