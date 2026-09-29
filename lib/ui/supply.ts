/**
 * Pure supply helpers shared by the logging surfaces (no DB imports, safe in previews).
 *
 * @example
 * if (isSupplyShort(medication.inventoryCount, amount)) showUpdateSupplyNotice();
 */

/**
 * True when `amount` is more than what's left: the backend refuses to log such a taken/partial
 * dose (`InventoryInsufficientError`), so offer "Update supply" instead of a doomed save.
 */
export function isSupplyShort(inventoryCount: number, amount: number): boolean {
  return amount > 0 && inventoryCount + 1e-9 < amount;
}
