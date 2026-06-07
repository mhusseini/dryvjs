# Dryvue

**Vue 3 integration for the DryvJS validation framework.**

Dryvue provides Vue 3 composables, plugins, and mixins that make DryvJS fully reactive. It wraps the core validation engine with Vue's reactivity system, giving you computed validation state, automatic re-validation on model changes, and seamless integration with Vue's `v-model` directive.

## Installation

```bash
npm install dryvue
```

Dryvue has `dryvjs` as a dependency and `vue` (^3.5) as a peer dependency.

## Setup

### Plugin Registration

Register the `Dryv` plugin in your Vue app to configure the reactive wrapper and default options:

```typescript
import { createApp } from 'vue'
import { Dryv } from 'dryvue'
import App from './App.vue'

const app = createApp(App)
app.use(Dryv)
app.mount('#app')
```

The `Dryv` plugin sets `Vue.reactive()` as the reactive wrapper so all validator state (text, type, group, isDirty, etc.) is automatically reactive.

### Static Rule Sets

Register rule sets at app startup with `DryvStaticRuleSets`, then reference them by name in composables:

```typescript
import { createApp } from 'vue'
import { Dryv, DryvStaticRuleSets } from 'dryvue'
import { personalDataRules } from './rules/personalData'
import { orderFormRules } from './rules/orderForm'
import App from './App.vue'

const app = createApp(App)
app.use(Dryv)
app.use(DryvStaticRuleSets, {
  PersonalData: personalDataRules,
  OrderForm: orderFormRules
})
app.mount('#app')
```

Rule set names are case-insensitive when resolved.

## Composables

### `useDryv(model, ruleSetOrName, options?)`

The primary composable. Creates a validation session for a model and returns reactive validation state.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `model` | `TModel \| Ref<TModel>` | The reactive model object (or a ref to one) |
| `ruleSetOrName` | `string \| DryvValidationRuleSet<TModel>` | A rule set object or a registered rule set name |
| `options?` | `DryvOptions` | Optional overrides for the default options |

**Returns:** `UseDryvResult<TModel>` (which is also a `Promise` for async parameter loading)

```typescript
interface UseDryvResult<TModel extends object, TParameters = object> {
  session: DryvValidationSession<TModel>
  model: TModel
  options: DryvOptions
  parameters?: Ref<TParameters>
  validatable: DryvValidatableObject<TModel>
  valid: Ref<boolean>
  dirty: Ref<boolean>
  validate: () => Promise<DryvValidationResult>
  clear: () => void
  commit: () => void
  revert: () => void
  reset: () => void
  setValidationResult: (result: DryvServerValidationResponse | DryvServerErrors) => boolean
  useMappedField<TTo>(field: keyof TModel, mappedValue: Ref<TTo | undefined>): DryvValidator
  useMappedGroup<TTo>(groupName: string, field: Ref<TTo | undefined>): DryvValidator
}
```

#### Basic Usage with Inline Rule Set

```vue
<template>
  <form @submit.prevent="validate">
    <div>
      <label>Name:</label>
      <input v-model="validatable.name.value" />
      <span v-if="validatable.name.hasErrors">{{ validatable.name.text }}</span>
    </div>

    <div>
      <label>Email:</label>
      <input v-model="validatable.email.value" />
      <span v-if="validatable.email.hasErrors">{{ validatable.email.text }}</span>
    </div>

    <button type="submit" :disabled="!valid">Submit</button>
    <button type="button" @click="revert" :disabled="!dirty">Revert</button>
    <button type="button" @click="commit" :disabled="!dirty || !valid">Commit</button>
  </form>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useDryv, type DryvValidationRuleSet } from 'dryvue'

interface MyForm {
  name: string
  email: string
}

const data = reactive<MyForm>({ name: '', email: '' })

const ruleSet: DryvValidationRuleSet<MyForm> = {
  name: 'MyForm',
  validators: {
    name: [
      {
        annotations: { required: true },
        validate: ($m) => !$m.name ? 'Name is required' : null
      }
    ],
    email: [
      {
        annotations: { required: true },
        validate: ($m) => !$m.email ? 'Email is required' : null
      },
      {
        validate: ($m) =>
          $m.email && !$m.email.includes('@')
            ? { type: 'error', text: 'Invalid email address' }
            : null
      }
    ]
  }
}

const { validatable, validate, valid, dirty, commit, revert } = useDryv(data, ruleSet)
</script>
```

#### Using a Registered Rule Set Name

```vue
<script setup lang="ts">
import { reactive } from 'vue'
import { useDryv } from 'dryvue'

const data = reactive({ anrede: '', vorname: '', nachname: '' })

// Looks up 'PersonalData' from the DryvStaticRuleSets registered at app startup
const { validatable, validate, valid } = useDryv(data, 'PersonalData')
</script>
```

#### Using a Ref Model

When the model is a `Ref`, the validator automatically watches for model replacements:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useDryv } from 'dryvue'

const data = ref({ name: '', email: '' })

const { validatable, validate } = useDryv(data, ruleSet)

// Later, replace the entire model:
data.value = { name: 'New', email: 'new@test.com' }
// The validator tree updates automatically
</script>
```

#### Accessing Validation State

```vue
<script setup lang="ts">
const { validatable, valid, dirty, session } = useDryv(data, ruleSet)

// Computed boolean refs
valid.value    // true if no errors or warnings
dirty.value    // true if any field has changed

// Per-field state via validatable
validatable.name.value       // current value
validatable.name.text        // validation message (or null)
validatable.name.type        // 'error', 'warning', 'success', or null
validatable.name.hasErrors   // boolean
validatable.name.hasWarnings // boolean
validatable.name.required    // boolean (from annotations)
validatable.name.group       // group name (or null)
validatable.name.groupShown  // whether group message is shown elsewhere

// Session-level results
session.results.fields       // Record<string, DryvFieldValidationResult | undefined>
session.results.groups       // Record<string, DryvFieldValidationResult | undefined>
</script>
```

#### Lifecycle Methods

```typescript
const { validate, clear, commit, revert, reset, setValidationResult } = useDryv(data, ruleSet)

// Trigger full form validation
const result = await validate()
if (result.success) {
  // submit form...
}

// Clear all validation messages (but keep dirty state)
clear()

// Commit: set current values as the new baseline (resets dirty)
commit()

// Revert: restore values to last committed state (resets dirty)
revert()

// Reset: commit + reset session (clears triggered state for autoAfterManual)
reset()

// Apply server-returned validation messages
setValidationResult({
  success: false,
  messages: {
    name: { type: 'error', text: 'Name already exists' }
  }
})
```

#### Async Parameters

If the rule set has `parameters` and the options provide a `loadParameters` function, `useDryv` returns a Promise that resolves after parameters are loaded:

```typescript
const dryvResult = useDryv(data, ruleSet, {
  ...options,
  loadParameters: async (ruleSetName) => {
    const response = await fetch(`/api/validation-params/${ruleSetName}`)
    return response.json()
  }
})

// Can be awaited:
const { validatable, validate, parameters } = await dryvResult

// Or used immediately (properties are available synchronously):
dryvResult.validate()

// Parameters are a writable computed ref:
dryvResult.parameters.value = { maxAge: 120 }
```

#### Options Setup Hook

Use the `setup` callback in options to provide per-instance configuration:

```typescript
const { validatable } = useDryv(data, ruleSet, {
  setup() {
    return {
      baseUrl: 'https://api.example.com',
      validationTrigger: 'manual'
    }
  }
})
```

### `useDryvValueProp(emit, prop, event?)`

A composable for building reusable validatable input components. It bridges `v-model` with the DryvJS validator, allowing your input components to work with both plain values and `DryvValidator` instances.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `emit` | `(event, ...args) => void` | The component's emit function |
| `prop` | `() => DryvValidatable<TValue> \| TValue` | Getter for the modelValue prop |
| `event?` | `string` | The event name (default: `'update:modelValue'`) |

**Returns:** `Ref<DryvValidator>` — a ref to a validator (real or synthetic).

#### Creating a Validatable Input Component

```vue
<!-- ValidatingInput.vue -->
<template>
  <div>
    <label>
      {{ label }}<span v-if="validatable.required">*</span>:
    </label>
    <input v-model="validatable.value" />
    <div class="error" v-if="validatable.hasErrors && !validatable.groupShown">
      {{ validatable.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { type DryvValidatable, useDryvValueProp } from 'dryvue'

const props = defineProps<{
  modelValue: string | DryvValidatable<any> | undefined
  label: string
}>()

const emit = defineEmits(['update:modelValue'])
const validatable = useDryvValueProp(emit, () => props.modelValue)
</script>
```

#### Using the Validatable Input

```vue
<template>
  <!-- Passing a validatable field — validation is fully integrated -->
  <validating-input v-model="validatable.name" label="Name" />

  <!-- Also works with plain values via v-model -->
  <validating-input v-model="plainString" label="Plain" />
</template>
```

When passed a `DryvValidator` (via the validatable proxy), the component directly binds to the validator's `value`, `text`, `hasErrors`, `required`, etc. When passed a plain value, it creates a lightweight synthetic validator that emits `update:modelValue` on changes.

### `useDryvGroupSlot(slotOrGroupNames?, groupNames?)`

A composable that collects grouped validation results from child components in a slot. It traverses the VNode tree of the slot and aggregates validation messages by group name.

**Overloads:**

```typescript
// Collect all groups from the default slot
useDryvGroupSlot(): Ref<DryvGroupValidationResult[]>

// Collect specific groups from the default slot
useDryvGroupSlot(groupNames: string[]): Ref<DryvGroupValidationResult[]>

// Collect groups from a named slot
useDryvGroupSlot(slotName: string, groupNames?: string[]): Ref<DryvGroupValidationResult[]>

// Collect groups from provided VNodes
useDryvGroupSlot(slot: VNode[], groupNames?: string[]): Ref<DryvGroupValidationResult[]>
```

**Returns:** `Ref<DryvGroupValidationResult[]>` with the following shape:

```typescript
interface DryvGroupValidationResult {
  name: string
  results: {
    type: DryvValidationResultType
    texts: string[]
  }[]
}
```

#### Building a Validation Group Component

```vue
<!-- ValidationGroup.vue -->
<template>
  <div>
    <slot />
    <div v-for="group in groups" :key="group.name">
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
```

#### Using the Validation Group

```vue
<template>
  <!-- Groups 'contact' messages from email and phone fields -->
  <validation-group :groups="['contact']">
    <validating-input v-model="validatable.email" label="Email" />
    <validating-input v-model="validatable.phone" label="Phone" />
  </validation-group>
</template>
```

When a field has `groupShown: true`, it means its message is being displayed by a group component. Individual field components can use `v-if="!validatable.groupShown"` to avoid showing duplicate messages.

### `useMappedField(field, mappedValue)` (via `useDryv`)

Maps a validatable field to a custom ref, useful when the UI representation differs from the model value (e.g., a date picker that stores a `Date` object but the model uses a string):

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useDryv } from 'dryvue'

const data = reactive({ birthDate: '' })
const { validatable, useMappedField } = useDryv(data, ruleSet)

// Create a mapped ref for a date picker component
const datePickerValue = ref<Date | undefined>()
const birthDateValidator = useMappedField('birthDate', datePickerValue)

// birthDateValidator has the same validation state (text, hasErrors, etc.)
// but its .value is bound to datePickerValue
</script>
```

### `useMappedGroup(groupName, field)` (via `useDryv`)

Creates a validator-like object that tracks the validation state of a named group:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useDryv } from 'dryvue'

const { useMappedGroup } = useDryv(data, ruleSet)

const contactGroupValue = ref<string | undefined>()
const contactGroup = useMappedGroup('contact', contactGroupValue)

// contactGroup.hasErrors — true if group 'contact' has errors
// contactGroup.text — the group's validation text
// contactGroup.type — the group's result type
</script>
```

## Options API Support

### `dryvValidatableMixin`

For components using the Options API (or class-based components with `vue-facing-decorator`), use the `dryvValidatableMixin`:

```vue
<template>
  <div>
    <label>{{ label }}</label>
    <input v-model="validatable.value" />
    <div class="error" v-if="validatable.type === 'error'">
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
class ValidatingInput extends Vue implements DryvValidatableMixin<string> {
  modelValue!: string | DryvValidatable<any, string>
  validatable!: DryvValidatable<any, string>

  @Prop()
  label: string = ''
}

export default toNative(ValidatingInput)
</script>
```

The mixin watches `modelValue` and creates a `validatable` data property that is either the incoming `DryvValidator` (if the prop is one) or a synthetic validator that emits `update:modelValue`.

## Complete Form Example

```vue
<template>
  <form @submit.prevent="onSubmit">
    <validation-group :groups="['contact']">
      <validating-input v-model="validatable.vorname" label="First Name" />
      <validating-input v-model="validatable.nachname" label="Last Name" />
      <validating-input v-model="validatable.emailAdresse" label="Email" />
      <validating-input v-model="validatable.telefonNummer" label="Phone" />
    </validation-group>

    <div class="actions">
      <button type="submit" :disabled="!valid">Submit</button>
      <button type="button" @click="commit" :disabled="!dirty || !valid">Save</button>
      <button type="button" @click="revert" :disabled="!dirty">Reset</button>
    </div>

    <pre>{{ JSON.stringify(model, null, 2) }}</pre>
  </form>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useDryv } from 'dryvue'
import ValidationGroup from './ValidationGroup.vue'
import ValidatingInput from './ValidatingInput.vue'

const data = reactive({
  vorname: '',
  nachname: '',
  emailAdresse: '',
  telefonNummer: ''
})

const { model, validatable, validate, valid, dirty, commit, revert, setValidationResult } =
  useDryv(data, 'PersonalData')

async function onSubmit() {
  const result = await validate()
  if (!result.success) return

  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(model)
    })
    const serverResult = await response.json()

    if (!serverResult.success) {
      setValidationResult(serverResult)
    }
  } catch {
    // handle error
  }
}
</script>
```

## Exports

Dryvue re-exports everything from `dryvjs`, so you only need to import from `dryvue`:

```typescript
// All dryvjs types and functions are available via dryvue
import {
  // Plugins
  Dryv,
  DryvStaticRuleSets,

  // Composables
  useDryv,
  useDryvValueProp,
  useDryvGroupSlot,

  // Options API
  dryvValidatableMixin,

  // Mapped validators
  useMappedField,
  useMappedGroup,

  // Re-exported from dryvjs
  type DryvValidationRuleSet,
  type DryvValidationResult,
  type DryvOptions,
  type DryvValidatable,
  type DryvValidatableObject,
  type DryvValidatableArray,
  DryvValidator,
  DryvValidationSession,
  defaultDryvOptions,
  dryvOptions,
  dryvRuleSet,
  getDryvValidator,
  getDryvModel
} from 'dryvue'
```

## License

MIT