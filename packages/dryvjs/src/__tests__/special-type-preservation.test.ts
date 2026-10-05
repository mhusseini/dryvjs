import { describe, it, expect } from 'vitest'
import { createObjectValidator, createRuleSet } from './helpers'
import { DryvArrayValidator, DryvFieldValidator, DryvObjectValidator } from '@/.'

interface FileItemModel {
  fileName: string
  contentType: string
  size: number
  file?: File
}

interface ModelWithFileField {
  name: string
  attachment?: File
}

interface ModelWithFileArray {
  name: string
  files: FileItemModel[]
}

describe('Special type preservation (File)', () => {
  describe('File on a child object property', () => {
    it('should preserve a File instance set during construction', () => {
      const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
      const ruleSet = createRuleSet<ModelWithFileField>()
      const { validator } = createObjectValidator<ModelWithFileField>(
        { name: 'doc', attachment: file },
        ruleSet
      )

      const attachmentValidator = validator.fields.attachment as DryvFieldValidator<any>
      expect(attachmentValidator).toBeDefined()
      expect(attachmentValidator.value).toBe(file)
      expect(attachmentValidator.value).toBeInstanceOf(File)
    })

    it('should preserve a File instance read through the facade proxy', () => {
      const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
      const ruleSet = createRuleSet<ModelWithFileField>()
      const { validator } = createObjectValidator<ModelWithFileField>(
        { name: 'doc', attachment: file },
        ruleSet
      )

      const facade = validator.facadeProxy as any
      expect(facade.attachment.value).toBe(file)
      expect(facade.attachment.value).toBeInstanceOf(File)
    })

    it('should preserve a File instance assigned through the facade proxy', () => {
      const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
      const ruleSet = createRuleSet<ModelWithFileField>()
      const { validator } = createObjectValidator<ModelWithFileField>(
        { name: 'doc', attachment: undefined },
        ruleSet
      )

      const facade = validator.facadeProxy as any
      facade.attachment = file

      expect(facade.attachment.value).toBe(file)
      expect(facade.attachment.value).toBeInstanceOf(File)
    })

    it('should preserve File.name and File.size through the validator', () => {
      const file = new File(['hello world'], 'report.pdf', { type: 'application/pdf' })
      const ruleSet = createRuleSet<ModelWithFileField>()
      const { validator } = createObjectValidator<ModelWithFileField>(
        { name: 'doc', attachment: file },
        ruleSet
      )

      const retrieved = (validator.fields.attachment as DryvFieldValidator<any>).value as File
      expect(retrieved.name).toBe('report.pdf')
      expect(retrieved.size).toBe(11)
      expect(retrieved.type).toBe('application/pdf')
    })
  })

  describe('File inside array item objects', () => {
    it('should preserve File instances on items set during construction', () => {
      const file1 = new File(['a'], 'a.txt', { type: 'text/plain' })
      const file2 = new File(['b'], 'b.txt', { type: 'text/plain' })
      const ruleSet = createRuleSet<ModelWithFileArray>()
      const { validator } = createObjectValidator<ModelWithFileArray>(
        {
          name: 'form',
          files: [
            { fileName: 'a.txt', contentType: 'text/plain', size: 1, file: file1 },
            { fileName: 'b.txt', contentType: 'text/plain', size: 1, file: file2 }
          ]
        },
        ruleSet
      )

      const arrValidator = validator.fields.files as unknown as DryvArrayValidator<FileItemModel>
      const items = arrValidator.childValidators()

      expect(items).toHaveLength(2)

      const item0 = items[0] as DryvObjectValidator<FileItemModel>
      const item1 = items[1] as DryvObjectValidator<FileItemModel>

      const fileField0 = item0.fields.file as DryvFieldValidator<any>
      const fileField1 = item1.fields.file as DryvFieldValidator<any>

      expect(fileField0.value).toBe(file1)
      expect(fileField0.value).toBeInstanceOf(File)
      expect(fileField1.value).toBe(file2)
      expect(fileField1.value).toBeInstanceOf(File)
    })

    it('should preserve File instances read through nested facade proxies', () => {
      const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' })
      const ruleSet = createRuleSet<ModelWithFileArray>()
      const { validator } = createObjectValidator<ModelWithFileArray>(
        {
          name: 'form',
          files: [{ fileName: 'doc.pdf', contentType: 'application/pdf', size: 4, file }]
        },
        ruleSet
      )

      const facade = validator.facadeProxy as any
      const firstItem = facade.files[0]
      expect(firstItem.file.value).toBe(file)
      expect(firstItem.file.value).toBeInstanceOf(File)
    })

    it('should preserve File instances when replacing the array via facade.value', () => {
      const file = new File(['new'], 'new.txt', { type: 'text/plain' })
      const ruleSet = createRuleSet<ModelWithFileArray>()
      const { validator } = createObjectValidator<ModelWithFileArray>(
        { name: 'form', files: [] },
        ruleSet
      )

      const arrValidator = validator.fields.files as unknown as DryvArrayValidator<FileItemModel>
      const facade = arrValidator.facadeProxy as any

      facade.value = [{ fileName: 'new.txt', contentType: 'text/plain', size: 3, file }]

      expect(arrValidator.childValidators()).toHaveLength(1)
      const itemValidator = arrValidator.childValidators()[0] as DryvObjectValidator<FileItemModel>
      const fileField = itemValidator.fields.file as DryvFieldValidator<any>
      expect(fileField.value).toBe(file)
      expect(fileField.value).toBeInstanceOf(File)
    })

    it('should preserve File instances when pushing items via facade', () => {
      const file = new File(['pushed'], 'pushed.txt', { type: 'text/plain' })
      const ruleSet = createRuleSet<ModelWithFileArray>()
      const { validator } = createObjectValidator<ModelWithFileArray>(
        { name: 'form', files: [] },
        ruleSet
      )

      const facade = validator.facadeProxy as any
      facade.files.push({ fileName: 'pushed.txt', contentType: 'text/plain', size: 6, file })

      const arrValidator = validator.fields.files as unknown as DryvArrayValidator<FileItemModel>
      expect(arrValidator.childValidators()).toHaveLength(1)

      const itemValidator = arrValidator.childValidators()[0] as DryvObjectValidator<FileItemModel>
      const fileField = itemValidator.fields.file as DryvFieldValidator<any>
      expect(fileField.value).toBe(file)
      expect(fileField.value).toBeInstanceOf(File)
    })

    it('should reflect File instances in the model value read from the parent', () => {
      const file = new File(['content'], 'file.bin', { type: 'application/octet-stream' })
      const ruleSet = createRuleSet<ModelWithFileArray>()
      const model: ModelWithFileArray = {
        name: 'form',
        files: [{ fileName: 'file.bin', contentType: 'application/octet-stream', size: 7, file }]
      }
      const { validator } = createObjectValidator<ModelWithFileArray>(model, ruleSet)

      const parentValue = validator.value as ModelWithFileArray
      expect(parentValue.files[0].file).toBe(file)
      expect(parentValue.files[0].file).toBeInstanceOf(File)
    })

    it('should preserve multiple File instances across array replacement cycles', () => {
      const ruleSet = createRuleSet<ModelWithFileArray>()
      const { validator } = createObjectValidator<ModelWithFileArray>(
        { name: 'form', files: [] },
        ruleSet
      )

      const arrValidator = validator.fields.files as unknown as DryvArrayValidator<FileItemModel>
      const facade = arrValidator.facadeProxy as any

      const file1 = new File(['first'], 'first.txt', { type: 'text/plain' })
      facade.value = [{ fileName: 'first.txt', contentType: 'text/plain', size: 5, file: file1 }]

      const file2 = new File(['second'], 'second.txt', { type: 'text/plain' })
      const file3 = new File(['third'], 'third.txt', { type: 'text/plain' })
      facade.value = [
        { fileName: 'second.txt', contentType: 'text/plain', size: 6, file: file2 },
        { fileName: 'third.txt', contentType: 'text/plain', size: 5, file: file3 }
      ]

      expect(arrValidator.childValidators()).toHaveLength(2)

      const item0 = arrValidator.childValidators()[0] as DryvObjectValidator<FileItemModel>
      const item1 = arrValidator.childValidators()[1] as DryvObjectValidator<FileItemModel>

      expect((item0.fields.file as DryvFieldValidator<any>).value).toBe(file2)
      expect((item1.fields.file as DryvFieldValidator<any>).value).toBe(file3)
    })
  })
})
