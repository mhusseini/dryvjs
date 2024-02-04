import type {
  DryvFieldValidationResult,
  DryvOptions,
  DryvProxy,
  DryvValidatable,
  DryvValidateFunctionResult,
  DryvValidationResult,
  DryvValidationRule,
  DryvValidationRuleSet,
  DryvValidationSession,
  DryvValidationSessionInternal
} from "./typings";

import { isDryvProxy, isDryvValidatable } from "@/core";
import { getMemberByPath } from "@/core/getMemberByPath";

export function dryvValidationSession<TModel extends object>(
  options: DryvOptions,
  ruleSet: DryvValidationRuleSet<TModel>
): DryvValidationSession<TModel> {
  if (!options.callServer) {
    throw new Error("The callServer option is required.");
  }
  if (!options.handleResult) {
    throw new Error("The handleResult option is required.");
  }
  if (!options.valueOfDate) {
    throw new Error("The valueOfDate option is required.");
  }

  const _excludedFields: {
    [field: string]: boolean
  } = {};
  let _isTriggered = false;
  let _depth = 0;
  let _processedFields: { [field: string | symbol]: boolean } | undefined = undefined;

  function isValidating() {
    return _depth > 0;
  }

  const session: DryvValidationSessionInternal<TModel> = {
    dryv: {
      callServer: options.callServer,
      handleResult: options.handleResult,
      valueOfDate: options.valueOfDate
    },

    async validateObject(
      objOrProxy: DryvValidatable<TModel> | DryvProxy<TModel>
    ): Promise<DryvValidationResult<TModel> | null> {
      const obj: DryvValidatable<TModel> = isDryvProxy(objOrProxy)
        ? (objOrProxy.$dryv as DryvValidatable<TModel>)
        : (objOrProxy as DryvValidatable<TModel>);
      if (!obj) {
        throw new Error("The value null of undefined is not validatable.");
      }

      _depth++;
      _isTriggered = true;
      try {
        const results: DryvValidationResult<TModel>[] = (
          await Promise.all(
            Object.entries(obj.value)
              .filter(([key, value]) => isDryvValidatable(value) && !isExcludedField(key))
              .map(([_, value]) => (value as any as DryvValidatable).validate())
          )
        ).filter((result) => !!result) as DryvValidationResult<TModel>[];

        const fieldResults = results.filter((r) => r).flatMap((r) => r.results);
        const warnings = fieldResults.filter((r) => r.status === "warning");
        const hasErrors = fieldResults.some((r) => r.status === "error");

        obj.status = hasErrors ? "error" : warnings.length > 0 ? "warning" : "success";

        return {
          results: fieldResults,
          hasErrors: hasErrors,
          hasWarnings: warnings.length > 0,
          warningHash: fieldResults.map((r) => r.text).join("|")
        };
      } finally {
        _depth--;
      }
    },

    async validateField<TValue>(
      field: DryvValidatable<TModel, TValue>,
      model?: DryvProxy<TModel>
    ): Promise<DryvValidationResult<TModel> | null> {
      switch (options.validationTrigger) {
        case "auto":
          if (session.$initializing) {
            return null;
          }
          break;
        case "manual":
          if (!isValidating()) {
            return null;
          }
          break;
        case "autoAfterManual":
          if (!_isTriggered && !isValidating()) {
            return null;
          }
          break;
      }

      if (_processedFields?.[field.field!]) {
        return null;
      }

      console.log("*** ", field.field)
      const newValidationChain = !_processedFields;
      if (newValidationChain) {
        _processedFields = {};
      }

      if (!model) {
        model = getModel(field);
      }

      const result = await validateFieldInternal(session, ruleSet, model, field, options);
    finally
      {
        if (newValidationChain) {
          _processedFields = undefined;
        }
      }

      if (result) {
        field.status = result.status;
        field.text = result.text;
        field.group = result.group;

        const status = result.status?.toLowerCase();

        return status === "success"
          ? null
          : {
            results: [result],
            hasErrors: status === "error",
            hasWarnings: status === "warning",
            warningHash: status === "warning" ? result.text : null
          };
      } else {
        field.status = "success";
        field.text = null;
        field.group = null;

        return null;
      }
    }
  };

  return session;

  function isExcludedField(fieldName: string, path?: string): boolean {
    if (!options.excludedFields) {
      return false;
    }

    const key = path ? path + "." + fieldName : fieldName;

    if (_excludedFields[key] === undefined) {
      _excludedFields[key] = !!options.excludedFields.find((regexp) => regexp.test(key));
    }

    return _excludedFields[key];
  }

  async function validateFieldInternal<TModel extends object>(
    session: DryvValidationSession<TModel>,
    ruleSet: DryvValidationRuleSet<TModel>,
    model: DryvProxy<TModel>,
    validatable: DryvValidatable<TModel>,
    options: DryvOptions
  ): Promise<DryvFieldValidationResult | null> {
    const field = validatable.field;
    if (!field || !ruleSet) {
      return Promise.resolve(null);
    }

    if (_processedFields) {
      _processedFields[field] = true;
    }

    const rules = ruleSet?.validators?.[field] as DryvValidationRule<TModel>[];

    if (!rules || rules.length <= 0) {
      return Promise.resolve(null);
    }

    if (await runDisablers(session, ruleSet, model, field)) {
      return Promise.resolve(null);
    }

    return await runValidators(session, rules, model, validatable, options);
  }

  async function runDisablers<TModel extends object>(
    session: DryvValidationSession<TModel>,
    ruleSet: DryvValidationRuleSet<TModel>,
    model: TModel,
    field: keyof TModel
  ) {
    const disablers = ruleSet?.disablers?.[field] as DryvValidationRule<TModel>[];

    if (disablers && disablers.length > 0) {
      for (const rule of disablers) {
        if (await rule.validate(model, session)) {
          return true;
        }
      }
    }

    return false;
  }

  async function runValidators<TModel extends object>(
    session: DryvValidationSession<TModel>,
    rules: DryvValidationRule<TModel>[],
    model: DryvProxy<TModel>,
    validatable: DryvValidatable<TModel>,
    options: DryvOptions
  ): Promise<DryvFieldValidationResult | null> {
    let result: DryvValidateFunctionResult = null;

    try {
      for (const rule of rules) {
        rule.related?.forEach((relatedField) => {
          const field = getMemberByPath(model.$dryv.value, relatedField);
          session.validateField(field, model);
        });
        const r = await rule.validate(model, session);
        if (!r) {
          // continue
        } else if (typeof r === "string") {
          result = {
            path: validatable.path!,
            status: "error",
            text: r,
            group: null
          };
          break;
        } else if (r.status !== "success") {
          result = r;
          break;
        }
      }
    } catch (error) {
      console.error(`DRYV: Error validating field '${String(validatable.field)}'`, error);
      if (options.exceptionHandling === "failValidation") {
        result = {
          path: validatable.path!,
          status: "error",
          text: "Validation failed.",
          group: null
        };
      }
    }

    return result && result.status !== "success" ? result : null;
  }
}

function getModel<TModel extends object>(parent: DryvValidatable<TModel>): DryvProxy<TModel> {
  while (parent.parent) {
    parent = parent.parent;
  }

  return parent.value.$model;
}
