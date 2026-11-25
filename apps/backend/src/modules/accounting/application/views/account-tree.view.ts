import type { AccountView } from './account.view.js';

/**
 * One node of the chart-of-accounts tree (ACC-001.7).
 *
 * A node is an ordinary account view plus its direct children; the recursive
 * shape carries the whole hierarchy in one response, in account-code order at
 * every level. `revision` is the version a client sends back on update, so a
 * tree read is enough to prepare a safe write of any node.
 */
export interface AccountTreeNodeView extends AccountView {
  readonly children: readonly AccountTreeNodeView[];
}

/** The tree response: one or more roots, each with its subtree. */
export interface AccountTreeView {
  readonly roots: readonly AccountTreeNodeView[];
}

/**
 * A role's mapping to one account (ACC-001.7).
 *
 * Every required role is present in the list, even when it is unmapped
 * (`accountId: null`), so a client can render the full mapping form without
 * cross-referencing the completeness endpoint.
 */
export interface AccountRoleAssignmentView {
  readonly role: string;
  readonly accountId: string | null;
  readonly updatedAt: string | null;
}
