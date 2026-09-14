import "server-only";

export type NamedOption = { id: string; name: string };

/**
 * A <select> only fed "active" records will silently drop the currently
 * selected value if that record was deactivated after being assigned —
 * saving the form then nulls the field. This appends the current value
 * (marked as inactive) so it stays selectable/visible until changed.
 */
export function withCurrentOption(
  activeOptions: NamedOption[],
  current: NamedOption | null | undefined,
): NamedOption[] {
  if (!current || activeOptions.some((o) => o.id === current.id)) {
    return activeOptions;
  }
  return [...activeOptions, { id: current.id, name: `${current.name} (inativo)` }];
}
