import { and, eq } from 'drizzle-orm';
import type { Database } from '../../../../infrastructure/database/database.module.js';
import { scopedDatabase } from '../../../../infrastructure/database/scoped-database.js';
import type { PlatformAuthorization } from '../../application/ports/platform-authorization.port.js';
import type { UserId } from '../../domain/value-objects/user-id.js';
import { platformAuthorizations } from './drizzle-platform-authorization.schema.js';

/** Platform authority is stored outside tenant-scoped roles and memberships. */
export class DrizzlePlatformAuthorizationRepository implements PlatformAuthorization {
  public constructor(private readonly database: Database) {}

  public async hasSystemAdmin(userId: UserId): Promise<boolean> {
    const rows = await scopedDatabase(this.database)
      .select({ userId: platformAuthorizations.userId })
      .from(platformAuthorizations)
      .where(
        and(
          eq(platformAuthorizations.userId, userId.value),
          eq(platformAuthorizations.role, 'system-admin'),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  public async grantSystemAdmin(userId: UserId): Promise<void> {
    try {
      await scopedDatabase(this.database).insert(platformAuthorizations).values({
        userId: userId.value,
        role: 'system-admin',
        grantedAt: new Date(),
      });
    } catch (error) {
      // Concurrent bootstrap may race after both instances read absence. The
      // primary key is the final authority; only that exact duplicate is safe.
      if (isDuplicateKey(error)) {
        if (await this.hasSystemAdmin(userId)) return;
      }
      throw error;
    }
  }
}

function isDuplicateKey(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth += 1) {
    if ((current as { readonly code?: unknown }).code === 'ER_DUP_ENTRY') return true;
    current = (current as { readonly cause?: unknown }).cause;
  }
  return false;
}
