/**
 * The read-side port convention (SHR-004; ADR-003 sections 6 and 14; ADR-004
 * sections 18 and 4; ADR-009).
 *
 * Command-side persistence and read-side querying are allowed to be different
 * ports, because they answer different questions: a repository exists so a use
 * case can *change* an aggregate under its invariants, while a read port exists
 * so a screen, a report or another module can *look* at data it does not own.
 *
 * ```ts
 * export interface SupplierBalancesRead
 *   extends ReadPort<SupplierBalanceCriteria, readonly SupplierBalanceRow[]> {}
 * ```
 *
 * Three rules keep a read port from becoming a side door around the Domain:
 *
 * - **Read only.** The surface is one `read` method: no save, no update, no
 *   delete, no transaction. A caller that wants to change something must go
 *   through the owning module's repository and its Domain, where the rules
 *   live.
 * - **Plain data out.** The result is a read model — a serializable snapshot of
 *   primitives — never an aggregate and never a Domain entity. Returning state
 *   in a shape that cannot be mutated means a query cannot bypass an invariant
 *   by handing someone a live object to edit (ADR-003, section 16: the read
 *   model is not the source of truth and never replaces it).
 * - **Criteria are closed and scoped.** `Criteria` is a module-owned type; it
 *   carries the business filters the module defines, and the application fills
 *   in the company/tenant scope resolved from the authenticated principal —
 *   never a value the client supplied (ADR-003, section 24: every business read
 *   has a valid company scope, and no path bypasses it).
 *
 * Where the interface lives is the module's choice — beside the query that
 * needs it in `application/`, or in `reporting/` for a projection built from
 * events. Its adapter lives in the owning module's `infrastructure/`. The port
 * itself stays free of MySQL, Drizzle and every other implementation detail, so
 * swapping the adapter changes nothing for its callers.
 */
export interface ReadPort<Criteria, ReadModel> {
  /**
   * Returns the read model for the given criteria.
   *
   * A read has no business side effect: calling it twice with the same criteria
   * changes nothing, and it reports what is stored — it never decides,
   * corrects or repairs anything on the way out.
   */
  read(criteria: Criteria): Promise<ReadModel>;
}
