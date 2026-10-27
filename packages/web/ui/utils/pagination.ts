/** Default page when the `page` URL parameter is missing or invalid. */
export const DEFAULT_PAGE = 1;

/** Default limit when the `limit` URL parameter is missing or invalid. */
export const DEFAULT_LIMIT = 20;

/** Lower bound of `limit`: clamped up on read, rejected on write. */
export const MIN_LIMIT = 1;

/** Upper bound of `limit`: clamped down on read, rejected on write. */
export const MAX_LIMIT = 100;