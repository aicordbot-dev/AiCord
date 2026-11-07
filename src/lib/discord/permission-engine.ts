/**
 * src/lib/discord/permission-engine.ts
 * Re-exports the PermissionEngine and canActOn functions from @/lib/engines/permission-engine.
 */

export * from '@/lib/engines/permission-engine';
import * as PermissionEngine from '@/lib/engines/permission-engine';
export { PermissionEngine };
export default PermissionEngine;
