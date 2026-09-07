/**
 * Dependency-free network probes used by health indicators. They speak just
 * enough of each protocol to verify reachability (TCP connect for Postgres,
 * PING for Redis) without pulling in a database driver.
 */
import { connect } from 'node:net';

export interface ProbeOutcome {
  readonly ok: boolean;
  readonly latencyMs: number;
  readonly error?: string;
}

export interface ServiceAddress {
  readonly host: string;
  readonly port: number;
}

/** Parses host/port out of a connection URL, falling back to defaultPort. */
export function parseServiceAddress(url: string, defaultPort: number): ServiceAddress {
  const parsed = new URL(url);
  const port = parsed.port !== '' ? Number.parseInt(parsed.port, 10) : defaultPort;
  return { host: parsed.hostname, port };
}

const DEFAULT_TIMEOUT_MS = 2_000;

/** Resolves when a TCP connection to host:port succeeds (or fails/times out). */
export function tcpProbe(
  address: ServiceAddress,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<ProbeOutcome> {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    let settled = false;

    const socket = connect({ host: address.host, port: address.port });

    const finish = (ok: boolean, error?: string): void => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve({ ok, latencyMs: Math.round(performance.now() - startedAt), error });
    };

    socket.setTimeout(timeoutMs, () => finish(false, 'connection timed out'));
    socket.once('connect', () => finish(true));
    socket.once('error', (error) => finish(false, error.message));
    socket.once('close', () => finish(false, 'connection closed before handshake completed'));
  });
}

/** Sends a Redis PING over a raw socket and resolves once '+PONG' arrives. */
export function redisPing(
  address: ServiceAddress,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<ProbeOutcome> {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    let settled = false;

    const socket = connect({ host: address.host, port: address.port });

    const finish = (ok: boolean, error?: string): void => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve({ ok, latencyMs: Math.round(performance.now() - startedAt), error });
    };

    socket.setTimeout(timeoutMs, () => finish(false, 'ping timed out'));
    socket.once('connect', () => socket.write('PING\r\n'));
    let received = '';
    socket.on('data', (chunk: Buffer) => {
      received += chunk.toString('utf8');
      if (received.includes('+PONG')) {
        finish(true);
      } else if (received.startsWith('-')) {
        finish(false, received.trim());
      }
    });
    socket.once('error', (error) => finish(false, error.message));
    socket.once('close', () => finish(false, 'connection closed before PONG received'));
  });
}
