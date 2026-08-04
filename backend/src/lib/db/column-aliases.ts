/** Optional snake_case column aliases for legacy db/query clients. */
export const COLUMN_ALIASES: Record<string, Record<string, string>> = {};

export function resolveColumnAlias(table: string, column: string): string {
  return COLUMN_ALIASES[table]?.[column] ?? column;
}
