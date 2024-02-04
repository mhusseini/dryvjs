import { VNode, computed, useSlots } from "vue";
import { DryvGroupValidationResult, DryvValidatable, isDryvValidatable } from "dryvjs";
import { Ref } from "@vue/reactivity";

export function useDryvGroupSlot(): Ref<DryvGroupValidationResult>
export function useDryvGroupSlot(groupNames: string[]): Ref<DryvGroupValidationResult>
export function useDryvGroupSlot(slotName: string, groupNames?: string[] | undefined): Ref<DryvGroupValidationResult>
export function useDryvGroupSlot(slot: VNode[], groupNames?: string[] | undefined): Ref<DryvGroupValidationResult>
export function useDryvGroupSlot(slotOrGroupNames?: string | VNode[] | undefined | string[], ...groupNames?: string[] | undefined): Ref<DryvGroupValidationResult> {
  let slot: string | VNode[] | undefined;
  if (!groupNames && Array.isArray(slotOrGroupNames)) {
    groupNames = slotOrGroupNames;
    slot = undefined;
  } else {
    slot = slotOrGroupNames;
  }

  const nodes = getSlot(slot);

  return computed<DryvGroupValidationResult>(() => {
    const groups = {};
    nodes.forEach(node => {
      const validatable: DryvValidatable = node.props?.modelValue;
      if (!isDryvValidatable(validatable)) {
        return;
      }

      validatable.groupShown = false;

      if (!validatable.group || (groupNames && groupNames.indexOf(validatable.group) < 0)) {
        return;
      }

      let group = groups[validatable.group];
      if (!group) {
        group = {};
        groups[validatable.group] = group;
      }

      let texts = group[validatable.status];
      if (!texts) {
        texts = [];
        group[validatable.status] = texts;
      }

      if (texts.indexOf(validatable.text) < 0) {
        texts.push(validatable.text);
      }

      validatable.groupShown = true;
    });

    return Object.entries(groups).map(([name, group]) => {
      return {
        name: name,
        results: Object.entries(group).map(([status, texts]) => ({
          status,
          texts
        }))
      };
    });
  });
}

function getSlot(slot: string | VNode[] | undefined): VNode[] {
  if (!slot) {
    return useSlots().default();
  } else if (typeof slot === "string") {
    return useSlots()[slot];
  } else {
    return slot;
  }
}