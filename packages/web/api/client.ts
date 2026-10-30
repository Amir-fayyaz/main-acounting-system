export const API_ERROR_CATEGORIES = ['validation', 'client', 'domain', 'technical'] as const;

export type ApiErrorCategory = (typeof API_ERROR_CATEGORIES)[number];
export type ApiErrorKind = 'network' | 'http' | 'invalid-response' | 'aborted' | 'unexpected';
export type ApiErrorSource = 'backend' | 'default';

export interface ApiErrorDetail {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

/** Serializable error shape for Server Actions, stores, and UI state. */
export interface ApiErrorData {
  readonly name: 'ApiError';
  readonly kind: ApiErrorKind;
  readonly source: ApiErrorSource;
  readonly message: string;
  readonly status?: number;
  readonly code?: string;
  readonly category?: ApiErrorCategory;
  readonly correlationId?: string;
  readonly details: readonly ApiErrorDetail[];
}

interface ApiErrorOptions extends Omit<ApiErrorData, 'name' | 'details'> {
  readonly details?: readonly ApiErrorDetail[];
}

/** Error thrown by apiRequest. Only safe, normalized fields are exposed. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly source: ApiErrorSource;
  readonly status?: number;
  readonly code?: string;
  readonly category?: ApiErrorCategory;
  readonly correlationId?: string;
  readonly details: readonly ApiErrorDetail[];

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = 'ApiError';
    this.kind = options.kind;
    this.source = options.source;
    this.status = options.status;
    this.code = options.code;
    this.category = options.category;
    this.correlationId = options.correlationId;
    this.details = options.details ?? [];
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toData(): ApiErrorData {
    return {
      name: 'ApiError',
      kind: this.kind,
      source: this.source,
      message: this.message,
      status: this.status,
      code: this.code,
      category: this.category,
      correlationId: this.correlationId,
      details: this.details,
    };
  }
}

export const DEFAULT_API_ERROR_MESSAGES = {
  network: 'Unable to connect to the server.',
  aborted: 'The request was cancelled.',
  invalidResponse: 'The server returned an invalid response.',
  unexpected: 'An unexpected client error occurred.',
  badRequest: 'The request could not be processed.',
  unauthorized: 'Authentication is required.',
  forbidden: 'The request is not allowed.',
  notFound: 'The requested resource was not found.',
  conflict: 'The request conflicts with the current state.',
  domain: 'The request violates a business rule.',
  rateLimited: 'Too many requests. Please try again later.',
  technical: 'An unexpected error occurred.',
  http: 'The request failed.',
} as const;

export type ApiResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'void';
export type ApiDataParser<T> = (data: unknown) => T;

type BaseApiRequestOptions = RequestInit & {
  readonly responseType?: ApiResponseType;
  readonly parse?: ApiDataParser<unknown>;
};

type JsonApiRequestOptions<T> = Omit<BaseApiRequestOptions, 'responseType' | 'parse'> & {
  readonly responseType?: 'json';
  readonly parse: ApiDataParser<T>;
};

type UnknownJsonApiRequestOptions = Omit<BaseApiRequestOptions, 'responseType' | 'parse'> & {
  readonly responseType?: 'json';
  readonly parse?: undefined;
};

type NonJsonApiRequestOptions<T extends Exclude<ApiResponseType, 'json'>> = Omit<
  BaseApiRequestOptions,
  'responseType' | 'parse'
> & {
  readonly responseType: T;
  readonly parse?: never;
};

const MAX_CODE_LENGTH = 200;
const MAX_FIELD_LENGTH = 500;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_CORRELATION_ID_LENGTH = 200;
const MAX_ERROR_DETAILS = 100;

/**
 * Native-fetch wrapper with a type-safe response mode.
 * JSON becomes typed only when the caller supplies a runtime parser.
 */
export function apiRequest<T>(
  input: RequestInfo | URL,
  options: JsonApiRequestOptions<T>,
): Promise<T>;
export function apiRequest(
  input: RequestInfo | URL,
  options?: UnknownJsonApiRequestOptions,
): Promise<unknown>;
export function apiRequest(
  input: RequestInfo | URL,
  options: NonJsonApiRequestOptions<'text'>,
): Promise<string>;
export function apiRequest(
  input: RequestInfo | URL,
  options: NonJsonApiRequestOptions<'blob'>,
): Promise<Blob>;
export function apiRequest(
  input: RequestInfo | URL,
  options: NonJsonApiRequestOptions<'arrayBuffer'>,
): Promise<ArrayBuffer>;
export function apiRequest(
  input: RequestInfo | URL,
  options: NonJsonApiRequestOptions<'formData'>,
): Promise<FormData>;
export function apiRequest(
  input: RequestInfo | URL,
  options: NonJsonApiRequestOptions<'void'>,
): Promise<void>;
export async function apiRequest(
  input: RequestInfo | URL,
  options: BaseApiRequestOptions = {},
): Promise<unknown> {
  const { responseType = 'json', parse, ...requestInit } = options;
  let response: Response;

  try {
    response = await fetch(input, requestInit);
  } catch (error: unknown) {
    throw errorFromFetchFailure(error);
  }

  if (!response.ok) {
    throw createHttpApiError(response.status, await readJsonSafely(response));
  }

  if (responseType === 'void') {
    return undefined;
  }

  let data: unknown;
  try {
    data = await readSuccessBody(response, responseType);
  } catch {
    throw invalidResponseError();
  }

  if (responseType !== 'json' || parse === undefined) {
    return data;
  }

  try {
    return parse(data);
  } catch {
    throw invalidResponseError();
  }
}

/** Converts a caught unknown value into the one application error contract. */
export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (isApiErrorData(error)) {
    return new ApiError(error);
  }

  if (isAbortError(error)) {
    return new ApiError({
      kind: 'aborted',
      source: 'default',
      code: 'REQUEST_ABORTED',
      message: DEFAULT_API_ERROR_MESSAGES.aborted,
    });
  }

  if (error instanceof TypeError) {
    return new ApiError({
      kind: 'network',
      source: 'default',
      code: 'NETWORK_ERROR',
      message: DEFAULT_API_ERROR_MESSAGES.network,
    });
  }

  return new ApiError({
    kind: 'unexpected',
    source: 'default',
    code: 'UNEXPECTED_ERROR',
    message: DEFAULT_API_ERROR_MESSAGES.unexpected,
  });
}

/** Makes an error safe to cross a Server Action or other serialization boundary. */
export function serializeApiError(error: unknown): ApiErrorData {
  return normalizeApiError(error).toData();
}

/** Creates the same normalized HTTP error from a status and an optional backend body. */
export function createHttpApiError(status: number, body?: unknown): ApiError {
  const fallback = fallbackForStatus(status);
  const backend = parseBackendError(body);

  if (backend !== null) {
    return new ApiError({
      kind: 'http',
      source: 'backend',
      status,
      code: backend.code,
      category: backend.category ?? fallback.category,
      message: backend.message,
      correlationId: backend.correlationId,
      details: backend.details,
    });
  }

  return new ApiError({
    kind: 'http',
    source: 'default',
    status,
    code: fallback.code,
    category: fallback.category,
    message: fallback.message,
  });
}

export function isApiError(error: unknown): error is ApiError | ApiErrorData {
  return error instanceof ApiError || isApiErrorData(error);
}

export function isUnauthorizedError(error: unknown): boolean {
  return normalizeApiError(error).status === 401;
}

export function isForbiddenError(error: unknown): boolean {
  return normalizeApiError(error).status === 403;
}

/** Maps backend dotted field paths to a caller-owned, allowlisted set of form fields. */
export function getFieldErrors<const Fields extends readonly string[]>(
  error: unknown,
  allowedFields: Fields,
): Partial<Record<Fields[number], string>> {
  const allowed = new Set<string>(allowedFields);
  const result: Partial<Record<Fields[number], string>> = {};

  for (const detail of normalizeApiError(error).details) {
    if (allowed.has(detail.field) && result[detail.field as Fields[number]] === undefined) {
      result[detail.field as Fields[number]] = detail.message;
    }
  }

  return result;
}

async function readSuccessBody(response: Response, responseType: Exclude<ApiResponseType, 'void'>) {
  if (response.status === 204 || response.status === 205) {
    throw new TypeError('A response body was expected.');
  }

  switch (responseType) {
    case 'json':
      return response.json();
    case 'text':
      return response.text();
    case 'blob':
      return response.blob();
    case 'arrayBuffer':
      return response.arrayBuffer();
    case 'formData':
      return response.formData();
  }
}

async function readJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function errorFromFetchFailure(error: unknown): ApiError {
  if (isAbortError(error)) {
    return new ApiError({
      kind: 'aborted',
      source: 'default',
      code: 'REQUEST_ABORTED',
      message: DEFAULT_API_ERROR_MESSAGES.aborted,
    });
  }

  return new ApiError({
    kind: 'network',
    source: 'default',
    code: 'NETWORK_ERROR',
    message: DEFAULT_API_ERROR_MESSAGES.network,
  });
}

function invalidResponseError(): ApiError {
  return new ApiError({
    kind: 'invalid-response',
    source: 'default',
    code: 'INVALID_RESPONSE',
    message: DEFAULT_API_ERROR_MESSAGES.invalidResponse,
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isApiErrorData(value: unknown): value is ApiErrorData {
  if (!isRecord(value) || value.name !== 'ApiError') {
    return false;
  }

  return (
    isApiErrorKind(value.kind) &&
    isApiErrorSource(value.source) &&
    isBoundedNonEmptyString(value.message, MAX_MESSAGE_LENGTH) &&
    (value.status === undefined ||
      (Number.isInteger(value.status) &&
        Number(value.status) >= 100 &&
        Number(value.status) <= 599)) &&
    (value.code === undefined || isBoundedNonEmptyString(value.code, MAX_CODE_LENGTH)) &&
    (value.category === undefined || isApiErrorCategory(value.category)) &&
    (value.correlationId === undefined ||
      isBoundedNonEmptyString(value.correlationId, MAX_CORRELATION_ID_LENGTH)) &&
    Array.isArray(value.details) &&
    value.details.length <= MAX_ERROR_DETAILS &&
    value.details.every(isApiErrorDetail)
  );
}

function isApiErrorDetail(value: unknown): value is ApiErrorDetail {
  return (
    isRecord(value) &&
    isBoundedNonEmptyString(value.field, MAX_FIELD_LENGTH) &&
    isBoundedNonEmptyString(value.code, MAX_CODE_LENGTH) &&
    isBoundedNonEmptyString(value.message, MAX_MESSAGE_LENGTH)
  );
}

function isApiErrorKind(value: unknown): value is ApiErrorKind {
  return (
    value === 'network' ||
    value === 'http' ||
    value === 'invalid-response' ||
    value === 'aborted' ||
    value === 'unexpected'
  );
}

function isApiErrorSource(value: unknown): value is ApiErrorSource {
  return value === 'backend' || value === 'default';
}

interface ParsedBackendError {
  readonly code: string;
  readonly category?: ApiErrorCategory;
  readonly message: string;
  readonly correlationId?: string;
  readonly details: readonly ApiErrorDetail[];
}

function parseBackendError(body: unknown): ParsedBackendError | null {
  if (!isRecord(body) || !isRecord(body.error)) {
    return null;
  }

  const code = boundedString(body.error.code, MAX_CODE_LENGTH);
  const message = boundedString(body.error.message, MAX_MESSAGE_LENGTH);
  if (code === undefined || message === undefined) {
    return null;
  }

  const category = isApiErrorCategory(body.error.category) ? body.error.category : undefined;
  const correlationId = boundedString(body.error.correlationId, MAX_CORRELATION_ID_LENGTH);
  const details = Array.isArray(body.error.details)
    ? body.error.details.slice(0, MAX_ERROR_DETAILS).flatMap(parseErrorDetail)
    : [];

  return { code, category, message, correlationId, details };
}

function parseErrorDetail(value: unknown): ApiErrorDetail[] {
  if (!isRecord(value)) {
    return [];
  }

  const field = boundedString(value.field, MAX_FIELD_LENGTH);
  const code = boundedString(value.code, MAX_CODE_LENGTH);
  const message = boundedString(value.message, MAX_MESSAGE_LENGTH);
  return field !== undefined && code !== undefined && message !== undefined
    ? [{ field, code, message }]
    : [];
}

function boundedString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed.slice(0, maxLength);
}

function isBoundedNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function isApiErrorCategory(value: unknown): value is ApiErrorCategory {
  return API_ERROR_CATEGORIES.some((category) => category === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fallbackForStatus(status: number): {
  code: string;
  category: ApiErrorCategory;
  message: string;
} {
  switch (status) {
    case 400:
      return {
        code: 'REQUEST_FAILED',
        category: 'client',
        message: DEFAULT_API_ERROR_MESSAGES.badRequest,
      };
    case 401:
      return {
        code: 'UNAUTHORIZED',
        category: 'client',
        message: DEFAULT_API_ERROR_MESSAGES.unauthorized,
      };
    case 403:
      return {
        code: 'FORBIDDEN',
        category: 'client',
        message: DEFAULT_API_ERROR_MESSAGES.forbidden,
      };
    case 404:
      return {
        code: 'NOT_FOUND',
        category: 'client',
        message: DEFAULT_API_ERROR_MESSAGES.notFound,
      };
    case 409:
      return { code: 'CONFLICT', category: 'client', message: DEFAULT_API_ERROR_MESSAGES.conflict };
    case 422:
      return {
        code: 'DOMAIN_ERROR',
        category: 'domain',
        message: DEFAULT_API_ERROR_MESSAGES.domain,
      };
    case 429:
      return {
        code: 'RATE_LIMITED',
        category: 'client',
        message: DEFAULT_API_ERROR_MESSAGES.rateLimited,
      };
    default:
      return status >= 500
        ? {
            code: 'INTERNAL_ERROR',
            category: 'technical',
            message: DEFAULT_API_ERROR_MESSAGES.technical,
          }
        : { code: 'REQUEST_FAILED', category: 'client', message: DEFAULT_API_ERROR_MESSAGES.http };
  }
}
