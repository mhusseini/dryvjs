import type { FileUploadForm } from '@/models'
import type { DryvValidationRuleSet } from '@softwareproduction/dryvue'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'application/pdf']

export const fileUploadRules: DryvValidationRuleSet<FileUploadForm> = {
  name: 'FileUploadForm',
  validators: {
    title: [
      {
        annotations: { required: true },
        validate: ($m) =>
          !$m.title?.trim()
            ? { type: 'error', text: 'Title is required.', group: null }
            : null
      }
    ],
    files: [
      {
        annotations: { required: true },
        validate: ($m) =>
          !$m.files?.length
            ? { type: 'error', text: 'Please select at least one file.', group: null }
            : null
      },
      {
        validate: ($m) => {
          const oversized = ($m.files ?? []).filter((f: File) => f.size > MAX_FILE_SIZE)
          return oversized.length
            ? { type: 'error', text: `${oversized.map((f: File) => f.name).join(', ')} exceed${oversized.length === 1 ? 's' : ''} the 5 MB limit.`, group: null }
            : null
        }
      },
      {
        validate: ($m) => {
          const invalid = ($m.files ?? []).filter((f: File) => !ALLOWED_TYPES.includes(f.type))
          return invalid.length
            ? { type: 'error', text: `Unsupported file type: ${invalid.map((f: File) => f.name).join(', ')}. Allowed: PNG, JPEG, GIF, PDF.`, group: null }
            : null
        }
      },
      {
        validate: ($m) => {
          const total = ($m.files ?? []).reduce((sum: number, f: File) => sum + f.size, 0)
          return total > 10 * 1024 * 1024
            ? { type: 'warning', text: 'Total upload size exceeds 10 MB. This may take a while.', group: null }
            : null
        }
      }
    ]
  }
}
