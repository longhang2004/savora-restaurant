/**
 * Modifier selection validation — server side.
 *
 * Modifier ids submitted by the client are never trusted: every option
 * must belong to the selected product, be available, and respect each
 * group's min/max selection constraints.
 */
import { AppError, ErrorCodes } from '@/lib/errors';
import type { PublicMenuItem, PublicModifierGroup } from './queries';

export interface ResolvedModifier {
  optionId: string;
  groupId: string;
  groupName: string;
  optionName: string;
  priceDeltaCents: number;
}

export function validateModifiers(
  item: Pick<PublicMenuItem, 'id' | 'name'>,
  groups: PublicModifierGroup[],
  selectedOptionIds: string[],
): ResolvedModifier[] {
  const optionByGroup = new Map<string, Map<string, PublicModifierGroup['options'][number]>>();

  for (const group of groups) {
    const map = new Map(group.options.map((o) => [o.id, o]));
    optionByGroup.set(group.id, map);
  }

  // Resolve selections.
  const selected: { option: PublicModifierGroup['options'][number]; group: PublicModifierGroup }[] = [];
  const counts = new Map<string, number>();

  for (const optionId of selectedOptionIds) {
    if (selectedOptionIds.indexOf(optionId) !== selectedOptionIds.lastIndexOf(optionId)) {
      throw new AppError(
        ErrorCodes.INVALID_MODIFIER_SELECTION,
        `An option cannot be selected more than once for ${item.name}.`,
      );
    }
    let found: { option: PublicModifierGroup['options'][number]; group: PublicModifierGroup } | undefined;
    for (const group of groups) {
      const option = optionByGroup.get(group.id)?.get(optionId);
      if (option) {
        found = { option, group };
        break;
      }
    }
    if (!found) {
      throw new AppError(
        ErrorCodes.INVALID_MODIFIER_SELECTION,
        `"${optionId}" is not a valid option for ${item.name}.`,
      );
    }
    if (!found.option.isAvailable) {
      throw new AppError(
        ErrorCodes.INVALID_MODIFIER_SELECTION,
        `"${found.option.name}" is currently unavailable.`,
      );
    }
    selected.push(found);
    counts.set(found.group.id, (counts.get(found.group.id) ?? 0) + 1);
  }

  // Enforce min/max per group.
  for (const group of groups) {
    const count = counts.get(group.id) ?? 0;
    if (count < group.minSelections) {
      throw new AppError(
        ErrorCodes.INVALID_MODIFIER_SELECTION,
        group.isRequired
          ? `Please choose ${group.minSelections === 1 ? 'an option' : `${group.minSelections} options`} for "${group.name}".`
          : `"${group.name}" requires at least ${group.minSelections} selection(s).`,
      );
    }
    if (count > group.maxSelections) {
      throw new AppError(
        ErrorCodes.INVALID_MODIFIER_SELECTION,
        `"${group.name}" allows at most ${group.maxSelections} selection(s).`,
      );
    }
  }

  // Order by group sort order, then option sort order (stable by insertion).
  return selected.map(({ option, group }) => ({
    optionId: option.id,
    groupId: group.id,
    groupName: group.name,
    optionName: option.name,
    priceDeltaCents: option.priceDeltaCents,
  }));
}
