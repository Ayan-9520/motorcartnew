import { err } from "@/lib/api-response";
import { InventoryError } from "./errors";

export function handleInventoryError(error: unknown) {
  if (error instanceof InventoryError) {
    return err(error.message, error.status);
  }
  const msg = error instanceof Error ? error.message : "Inventory request failed";
  return err(msg, 400);
}
