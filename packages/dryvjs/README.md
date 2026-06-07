# DryvJS

**A model-based, reactive validation engine for JavaScript and TypeScript.**

DryvJS is the core, framework-agnostic validation library that powers the Dryv ecosystem. It provides a complete validation engine that builds a tree of validators mirroring your data model, supporting nested objects, arrays, async rules, server-side validation, dirty tracking, and more.

## Installation

```bash
npm install dryvjs
```

## Core Concepts

### Validation Rule Sets

A `DryvValidationRuleSet` defines all validation rules for a model. Rules are organized by field path (including dot-notation for nested fields).

```typescript
import type { DryvValidationRuleSet } from 'dryvjs'

interface SignupForm {
  username: string
  email: string
  age: number
}

const ruleSet: DryvValidationRuleSet<SignupForm> = {
  name: 'SignupForm',
  validators: {
    username: [
      {
        annotations: { required: true },
        validate: ($m) => !$m.username ? 'Username is required' : null
      }
    ],
    email: [
      {
        annotations: { required: true },
        validate: ($m) => !$m.email
          ? { type: 'error', text: 'Email is required', group: null }
          : null
      }
    ],
    age: [
      {
        validate: ($m) => $m.age < 18
          ? { type: 'error', text: 'Must be at least 18 years old' }
          : null
      }
    ]
  }
}
```

### Validation Rules

Each rule is a `DryvValidationRule<TModel>` with the following shape:

```typescript
interface DryvValidationRule<TModel extends object> {
  async?: boolean
  annotations?: {
    required?: boolean
    [path: string]: unknown
  }
  related?: string[]
  group?: string
  validate: <TInput = TModel>(
    $m: TInput,
    session: DryvValidationSession<TModel>
  ) => DryvValidateFunctionResult
}
```

A rule's `validate` function can return:

| Return Value | Meaning |
|---|---|
| `null`, `undefined`, `true` | Validation passes |
| `string` | Shorthand for an error with the string as text |
| `{ type, text, group? }` | A `DryvFieldValidationResult` |
| `Promise<...>` | Async validation — any of the above wrapped in a Promise |

### Validation Result Types

Results use the `DryvValidationResultType` which can be `'error'`, `'warning'`, or `'success'`.

```typescript
interface DryvFieldValidationResult {
  path?: string
  type?: DryvValidationResultType  // 'error' | 'warning' | 'success'
  text?: string | null
  group?: string | null
}

interface DryvValidationResult {
  results: DryvFieldValidationResult[]
  success: boolean
  hasErrors: boolean
  hasWarnings: boolean
  hasNewWarnings: boolean | undefined | null
  warningHash: string | undefined | null
  path?: string
}
```

## Usage

### Setting Up a Validation Session

```typescript
import {
  DryvValidationSession,
  DryvObjectValidator,
  defaultDryvOptions,
  type DryvValidationRuleSet,
  type DryvOptions
} from 'dryvjs'

interface MyForm {
  name: string
  email: string
}

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
        validate: ($m) =>
          $m.email && !$m.email.includes('@')
            ? { type: 'error', text: 'Invalid email' }
            : null
      }
    ]
  }
}

const model: MyForm = { name: '', email: '' }
const options: DryvOptions = { ...defaultDryvOptions }
const session = new DryvValidationSession<MyForm>(options, ruleSet)
const validator = new DryvObjectValidator<MyForm>(model, session, undefined, options)

// Validate the entire form
const result = await validator.validate()
console.log(result.success)     // false
console.log(result.hasErrors)   // true
console.log(result.results)     // Array of field results
```

### Nested Object Validation

Use dot-notation paths to define rules for nested fields:

```typescript
interface Address {
  street: string
  city: string
  zip: string
}

interface OrderForm {
  customerName: string
  address: Address
}

const ruleSet: DryvValidationRuleSet<OrderForm> = {
  name: 'OrderForm',
  validators: {
    customerName: [
      {
        annotations: { required: true },
        validate: ($m) => !$m.customerName ? 'Customer name is required' : null
      }
    ],
    'address.street': [
      {
        annotations: { required: true },
        validate: ($m) => !$m.street ? 'Street is required' : null
      }
    ],
    'address.city': [
      {
        annotations: { required: true },
        validate: ($m) => !$m.city ? 'City is required' : null
      }
    ]
  }
}
```

### Array Validation

Rules can target items inside arrays using dot-notation through the array field:

```typescript
interface Attendee {
  name?: string
}

interface Course {
  name?: string
  people: {
    attendees: Attendee[]
  }
}

const ruleSet: DryvValidationRuleSet<Course> = {
  name: 'Course',
  validators: {
    name: [
      {
        annotations: { required: true },
        validate: ($m: Course) =>
          !/\S/.test($m.name || '') ? "Please provide the course's name" : null
      }
    ],
    'people.attendees.name': [
      {
        annotations: { required: true },
        validate: ($m: Attendee) =>
          !/\S/.test($m?.name || '') ? "Please provide the attendee's name" : null
      }
    ]
  }
}
```

### Async & Server-Side Validation

Mark rules as async and use `session.dryv.callServer()` and `session.dryv.handleResult()` to perform server-side validation:

```typescript
const ruleSet: DryvValidationRuleSet<MyForm> = {
  name: 'MyForm',
  validators: {
    email: [
      {
        async: true,
        validate: ($m, session) => {
          return session.dryv
            .callServer('/api/validate-email', 'POST', { email: $m.email })
            .then(($r) => session.dryv.handleResult(session, $m, 'email', null, $r))
            .then(($result) => $result?.errorMessage)
        }
      }
    ]
  }
}
```

The default `callServer` implementation uses `fetch`:

```typescript
// Default behavior — can be overridden via options
callServer: async (url, method, data) => {
  if (data && /get/i.test(method)) {
    // Appends data as query parameters for GET requests
    const query = Object.entries(data)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&')
    url = `${url}?${query}`
    data = undefined
  }
  const response = await fetch(url, { method, body: data && JSON.stringify(data) })
  return await response.json()
}
```

### Related Fields

When validating one field should trigger re-validation of another field, use the `related` property:

```typescript
const ruleSet: DryvValidationRuleSet<ContactForm> = {
  name: 'ContactForm',
  validators: {
    email: [
      {
        related: ['phone'],
        validate: ($m) =>
          !$m.phone && !$m.email
            ? { type: 'error', text: 'Provide either email or phone.', group: 'contact' }
            : null
      }
    ],
    phone: [
      {
        related: ['email'],
        validate: ($m) =>
          !$m.phone && !$m.email
            ? { type: 'error', text: 'Provide either email or phone.', group: 'contact' }
            : null
      }
    ]
  }
}
```

### Grouped Validation Messages

Assign a `group` to validation results to consolidate messages:

```typescript
{
  validate: ($m) =>
    !$m.phone && !$m.email
      ? { type: 'error', text: 'Please provide a contact method.', group: 'contact' }
      : null
}
```

Grouped results are tracked in `session.results.groups`:

```typescript
const groupResult = session.results.groups['contact']
// { type: 'error', text: 'Please provide a contact method.', group: 'contact' }
```

### Disablers

Conditionally disable validation for specific fields:

```typescript
const ruleSet: DryvValidationRuleSet<MyForm> = {
  name: 'MyForm',
  validators: {
    title: [
      {
        annotations: { required: true },
        validate: ($m) => !$m.title ? 'Title is required' : null
      }
    ]
  },
  disablers: {
    title: [
      {
        validate: ($m) => $m.name === 'test'  // Skip title validation when name is 'test'
      }
    ]
  }
}
```

### Parameters

Rule sets can include parameters that are accessible within rules via `session.parameter()`:

```typescript
const ruleSet: DryvValidationRuleSet<MyForm, MyParameters> = {
  name: 'MyForm',
  validators: {
    birthDate: [
      {
        validate: ($m, session) => {
          const maxDate = session.parameter('maxBirthDate')
          return session.dryv.parseDate($m.birthDate, 'en-US', 'YYYY-MM-DD') >
            session.dryv.parseDate(maxDate, 'en-US', 'YYYY-MM-DD')
            ? { type: 'error', text: 'You must be at least 18 years old.' }
            : null
        }
      }
    ]
  },
  parameters: {
    maxBirthDate: '2005-11-28'
  }
}
```

### Warnings vs. Errors

Rules can return warnings instead of errors. The validation result tracks both:

```typescript
{
  validate: ($m) =>
    !$m.name
      ? { type: 'warning', text: 'Name is recommended but not required' }
      : null
}
```

```typescript
const result = await validator.validate()
result.hasErrors       // true if any error-type results exist
result.hasWarnings     // true if any warning-type results exist
result.hasNewWarnings  // true if warnings changed since last validation
```

### Dirty Tracking

The validator tree tracks whether values have changed from their initial state:

```typescript
const validator = new DryvObjectValidator(model, session, undefined, options)

validator.isDirty  // false initially

// After a field value changes:
validator.isDirty  // true

// Commit current values as the new baseline
validator.commit()
validator.isDirty  // false

// Revert to the last committed values
validator.revert()
```

### Server Validation Results

Apply server-returned validation results to the validator tree:

```typescript
const serverResponse = {
  success: false,
  messages: {
    name: { type: 'error', text: 'Name already taken', group: null },
    email: { type: 'warning', text: 'Email domain is unusual', group: null }
  }
}

validator.setValidationResult(serverResponse)

// Individual validators now reflect the server results
validator.fields.name.text       // 'Name already taken'
validator.fields.name.hasErrors  // true
```

### Validation Triggers

Control when field validation runs via the `validationTrigger` option:

| Trigger | Behavior |
|---|---|
| `'immediate'` | Validate on every field change |
| `'auto'` | Validate on field change (default timing) |
| `'manual'` | Only validate when `validate()` is explicitly called |
| `'autoAfterManual'` | Auto-validate only after the first manual `validate()` call (default) |

```typescript
const options: DryvOptions = {
  ...defaultDryvOptions,
  validationTrigger: 'manual'
}
```

### Customizing Options

Override any default option:

```typescript
import { defaultDryvOptions, type DryvOptions } from 'dryvjs'

const options: DryvOptions = {
  ...defaultDryvOptions,

  // Custom server call implementation
  callServer: async (url, method, data) => {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    })
    return response.json()
  },

  // Custom date parsing
  parseDate: (date, locale, format) => new Date(date).valueOf(),

  // Custom formatting
  format: (data, type, pattern) => data?.toString() ?? '',

  // Fail validation on exceptions (default: succeed)
  exceptionHandling: 'failValidation',

  // Exclude fields matching these patterns from validation
  excludedFields: [/^_/, /^\$/],

  // Base URL for server calls
  baseUrl: 'https://api.example.com',

  // Make objects reactive (used by Vue integration)
  reactiveWrapper: (o) => o
}
```

### Rule Set Resolvers

Register rule set resolvers to look up rule sets by name:

```typescript
import { defaultDryvRuleSetResolvers, dryvRuleSet } from 'dryvjs'

defaultDryvRuleSetResolvers.push({
  name: 'My Resolver',
  resolve(ruleSetName) {
    // Return the matching rule set or undefined
    return myRuleSets[ruleSetName]
  }
})

// Later, resolve by name:
const ruleSet = dryvRuleSet<MyForm>('SignupForm')
```

### Merging Options

Use `dryvOptions()` to merge multiple option objects with defaults:

```typescript
import { dryvOptions } from 'dryvjs'

const merged = dryvOptions(
  { validationTrigger: 'manual' },
  { baseUrl: '/api' }
)
// Merges: defaultDryvOptions + first arg + second arg
```

### Utility Functions

#### `getDryvValidator(obj)`

Extract the `DryvValidator` from a validatable object or a raw validator:

```typescript
import { getDryvValidator } from 'dryvjs'

const validator = getDryvValidator(validatable.name)
// Returns the underlying DryvValidator instance
```

#### `getDryvModel(obj)`

Extract the underlying model from a validatable object:

```typescript
import { getDryvModel } from 'dryvjs'

const model = getDryvModel(validatable)
// Returns the raw model object
```

## Validator Hierarchy

```
DryvValidator (abstract base)
├── DryvFieldValidator       — Leaf validator for scalar fields
└── DryvCompositeValidator   — Base for composite validators
    ├── DryvObjectValidator  — Validates objects with named fields
    └── DryvArrayValidator   — Validates arrays of items
```

- **`DryvFieldValidator`** — Wraps a single field value. Supports `value` get/set, dirty tracking, and individual field validation.
- **`DryvObjectValidator`** — Wraps an object. Creates child validators for each field. Uses `Proxy` to observe field changes and trigger validation automatically.
- **`DryvArrayValidator`** — Wraps an array. Creates child validators for each item. Intercepts array mutations (`push`, `pop`, `splice`, etc.) to maintain the validator tree.

## API Reference

### `DryvValidationSession`

| Member | Description |
|---|---|
| `validateObject(validator)` | Validate an object and all its children |
| `validateField(field, model?)` | Validate a single field |
| `parameter(key)` | Get a parameter value from the rule set |
| `reset()` | Reset the session (clear triggered state and warning hash) |
| `results.fields` | Reactive record of field validation results |
| `results.groups` | Reactive record of group validation results |
| `isValidating` | Whether a validation is currently in progress |
| `dryv.callServer(url, method, data)` | Call a server endpoint |
| `dryv.handleResult(session, model, field, rule, result)` | Process a server result |
| `dryv.parseDate(date, locale, format)` | Parse a date string |
| `dryv.format(data, type, pattern?)` | Format data |

### `DryvValidator` (base)

| Member | Description |
|---|---|
| `value` | The current value |
| `path` | Dot-notation path from the root |
| `text` | Validation message text |
| `type` | Result type: `'error'`, `'warning'`, `'success'`, or `null` |
| `group` | Group name for the validation result |
| `groupShown` | Whether the group message is displayed |
| `required` | Whether the field has a required annotation |
| `hasErrors` | Whether the field has an error |
| `hasWarnings` | Whether the field has a warning |
| `isSuccess` | Whether the field is valid |
| `isDirty` | Whether the value has changed |
| `validate()` | Trigger validation |
| `clear()` | Clear validation results |
| `commit()` | Commit the current value as the baseline |
| `revert()` | Revert to the last committed value |
| `setValidationResult(response)` | Apply server validation results |
| `destroy()` | Clean up the validator and its children |

## License

MIT