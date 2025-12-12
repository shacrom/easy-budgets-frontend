/**
 * Enum representing the different section types available in a budget.
 * Use this enum instead of hardcoded strings to identify sections.
 */
export enum BudgetSection {
  CompositeBlocks = 'compositeBlocks',
  ItemTables = 'itemTables',
  SimpleBlock = 'simpleBlock',
  Summary = 'summary',
  Conditions = 'conditions',
  Signature = 'signature'
}

/**
 * Type representing a valid budget section key.
 * Useful for type-safe section references.
 */
export type BudgetSectionKey = `${BudgetSection}`;

/**
 * Default order of all sections in a budget.
 * This is the order used when no custom order is specified.
 */
export const DEFAULT_SECTION_ORDER: BudgetSection[] = [
  BudgetSection.CompositeBlocks,
  BudgetSection.ItemTables,
  BudgetSection.SimpleBlock,
  BudgetSection.Summary,
  BudgetSection.Conditions,
  BudgetSection.Signature
];

/**
 * Sections that contain budget content (not utility sections like signature).
 * Used for summary breakdown ordering.
 */
export const CONTENT_SECTIONS: BudgetSection[] = [
  BudgetSection.CompositeBlocks,
  BudgetSection.ItemTables,
  BudgetSection.SimpleBlock
];

/**
 * Helper function to check if a string is a valid BudgetSection.
 * @param value - The string to check
 * @returns true if the value is a valid BudgetSection
 */
export function isBudgetSection(value: string): value is BudgetSection {
  return Object.values(BudgetSection).includes(value as BudgetSection);
}

/**
 * Helper function to safely cast a string array to BudgetSection array,
 * filtering out invalid values.
 * @param values - Array of strings to convert
 * @returns Array of valid BudgetSection values
 */
export function toBudgetSections(values: string[]): BudgetSection[] {
  return values.filter(isBudgetSection) as BudgetSection[];
}

/**
 * Legacy key mapping for migrating old section keys to new BudgetSection values.
 */
const LEGACY_KEY_MAP: Record<string, BudgetSection> = {
  'textBlocks': BudgetSection.CompositeBlocks,
  'materials': BudgetSection.ItemTables,
  'countertops': BudgetSection.SimpleBlock
};

/**
 * Maps a legacy section key to its corresponding BudgetSection.
 * Returns the original value as BudgetSection if already valid,
 * or maps legacy keys to their new equivalents.
 * @param key - The section key (may be legacy or current)
 * @returns The corresponding BudgetSection, or null if invalid
 */
export function mapLegacySectionKey(key: string): BudgetSection | null {
  // Check if it's already a valid BudgetSection
  if (isBudgetSection(key)) {
    return key as BudgetSection;
  }
  // Check if it's a legacy key
  return LEGACY_KEY_MAP[key] ?? null;
}

/**
 * Maps an array of section keys (potentially legacy) to BudgetSection array.
 * Filters out any invalid keys.
 * @param keys - Array of section keys
 * @returns Array of valid BudgetSection values
 */
export function migrateSectionOrder(keys: string[]): BudgetSection[] {
  return keys
    .map(mapLegacySectionKey)
    .filter((section): section is BudgetSection => section !== null);
}
