import { PATH_METADATA } from '@nestjs/common/constants';
import type { Type } from '@nestjs/common';

import type { AuthorizationPolicy } from '../authorization/authorization-policy.js';

/** The minimal request surface the tenant routes are resolved from. */
export interface TenantRouteRequest {
  readonly params?: Record<string, string | undefined>;
}

/**
 * The route parameter that names the tenant of an operation (IAM-006; IAM-007;
 * TNT-002).
 *
 * One function answers the question for the two boundaries that must agree on
 * it: the authorization guard (which proves membership for that target) and the
 * tenant-scope interceptor (which publishes it as the ambient scope). If each
 * inferred the parameter separately, a route could be *authorized* as
 * tenant-scoped while being *executed* without a tenant scope — exactly the
 * divergence that turns into a cross-tenant read.
 *
 * Resolution order:
 *
 * 1. the policy's explicit `tenantParam` — the reviewed declaration;
 * 2. the conventional `:tenantId` parameter, which is tenant-scoped everywhere;
 * 3. `:id` only on the root `tenants` resource, where it names the Tenant
 *    itself rather than an ordinary child resource.
 *
 * `undefined` means the operation is platform-level. That answer is never a
 * fallback for a malformed tenant route: a route that has a tenant parameter
 * still resolves it (and the caller refuses when its value is missing).
 */
export function resolveTenantRouteParam(
  request: TenantRouteRequest,
  controller: Type<unknown>,
  policy: AuthorizationPolicy | undefined,
): string | undefined {
  if (policy?.tenantParam !== undefined) {
    return policy.tenantParam;
  }

  if (request.params?.tenantId !== undefined) {
    return 'tenantId';
  }

  const controllerPath = Reflect.getMetadata(PATH_METADATA, controller) as
    string | readonly string[] | undefined;
  const paths =
    controllerPath === undefined
      ? []
      : Array.isArray(controllerPath)
        ? controllerPath
        : [controllerPath];
  const isTenantResourceController = paths.some(
    (path) => path.replace(/^\/+|\/+$/g, '') === 'tenants',
  );

  return isTenantResourceController && request.params?.id !== undefined ? 'id' : undefined;
}

/** The claimed tenant id of a resolved route parameter, or `undefined` when absent/blank. */
export function claimedTenantId(
  request: TenantRouteRequest,
  parameter: string,
): string | undefined {
  const claimed = request.params?.[parameter];

  return claimed === undefined || claimed.trim() === '' ? undefined : claimed;
}
