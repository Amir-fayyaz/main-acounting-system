/**
 * Where a reference example came from. It exists to demonstrate enum
 * serialization in the baseline example endpoint and carries no business
 * meaning (it is never persisted and owns nothing).
 */
export const EXAMPLE_ORIGINS = ['seed', 'created'] as const;

export type ExampleOrigin = (typeof EXAMPLE_ORIGINS)[number];
