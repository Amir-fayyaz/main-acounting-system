import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { PERMISSION_CATALOG } from '../../domain/permission.js';
import { toPermissionView } from '../views/role.mapper.js';
import type { PermissionView } from '../views/permission.view.js';

/**
 * Reads the permission catalog (IAM-004).
 *
 * A query: it changes nothing, opens no transaction and records no event. The
 * catalog is the platform's capability vocabulary, so the read is **not**
 * tenant-scoped — every tenant sees the same capabilities, and none may invent
 * one. It takes no input, which is why it needs no query object.
 *
 * The result is ordered by the catalog's declaration order, so the list is
 * deterministic across calls.
 */
export class ListPermissionsUseCase {
  public async execute(): Promise<Result<readonly PermissionView[], DomainError>> {
    return Result.ok(PERMISSION_CATALOG.map(toPermissionView));
  }
}
