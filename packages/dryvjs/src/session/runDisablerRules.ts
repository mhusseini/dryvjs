import type { DryvValidationSession } from './DryvValidationSession'
import type { DryvValidationRule } from '@/types'

/**
 * Runs disabler rules for a given field. Returns `true` if any disabler fires
 * (meaning validation should be skipped for this field).
 */

export async function runDisablerRules<TModel extends object>(
    disablers: DryvValidationRule<TModel>[] | undefined,
    model: any,
    session: DryvValidationSession<TModel>
): Promise<boolean> {
    if (disablers && disablers.length > 0) {
        for (const rule of disablers) {
            if (await rule.validate(model, session)) {
                return true;
            }
        }
    }

    return false;
}
