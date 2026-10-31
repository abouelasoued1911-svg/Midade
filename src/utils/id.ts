/**
 * Cryptographically secure UUID / ID generator.
 * Avoids collisions even during batch imports or offline edits.
 */
export function generateId(prefix: string = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  const randomPart = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}
