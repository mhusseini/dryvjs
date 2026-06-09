import type { DryvValidationSession } from './DryvValidationSession'
import type { DryvValidationRule } from '@/types'

/**
 * Runs disabler rules for a given field.
 *
 * @typeParam TModel - The root model type.
 * @param disablers - The disabler rules to evaluate (may be `undefined`).
 * @param model - The model instance to pass to each rule.
 * @param session - The current validation session.
 * @returns `true` if any disabler fires (meaning validation should be skipped).
 */
export async function runDisablerRules<TModel extends object>(
    disablers: DryvValidationRule<TModel>[] | undefined,
    model: TModel,
    session: DryvValidationSession<TModel>
): Promise<boolean> {
    if (disablers && disablers.length > 0) {
        for (const rule of disablers) {
            if (await rule.validate(model, session.ruleContext)) {
                return true;
            }
        }
    }

    return false;
}
