/** One row from GET /v1/tenants/{tenantId}/memberships */
export type TenantMember = {
  membershipId: string;
  status: string;
  userId: string;
  displayName: string;
  email: string;
  userStatus: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
};

export type MembershipsMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type MembershipsResponse = {
  data: TenantMember[];
  meta: MembershipsMeta;
};

export type TenantMembershipsResult =
  | { ok: true; result: MembershipsResponse }
  | { ok: false; message: string; correlationId?: string };
