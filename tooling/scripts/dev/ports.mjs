/**
 * Port helpers for `pnpm run dev:local` (Dev bootstrap).
 *
 * A port is reported as a conflict only when a process other than this
 * project's own running Compose stack binds it: a rerun with `docker compose up`
 * already holding the ports (containers still running from a previous session)
 * is expected, not an error.
 *
 * Networking is injectable so the logic is unit-testable without sockets.
 */

import net from 'node:net';

export const DEFAULT_PORTS = {
  MYSQL_PORT: 3306,
  REDIS_PORT: 6379,
  MINIO_PORT: 9000,
  MINIO_CONSOLE_PORT: 9001,
  BACKEND_PORT: 3000,
};

/** Host ports the default-profile Compose services publish. */
export const INFRASTRUCTURE_PORT_VARIABLES = [
  'MYSQL_PORT',
  'REDIS_PORT',
  'MINIO_PORT',
  'MINIO_CONSOLE_PORT',
  'BACKEND_PORT',
];

export class PortConflictError extends Error {
  constructor(variable, port) {
    super(
      `Port ${port} (${variable}) is already in use by another process. ` +
        `Set ${variable} in ".env" to a free port, or stop the process binding ${port}.`,
    );
    this.name = 'PortConflictError';
    this.variable = variable;
    this.port = port;
  }
}

/** Resolves one port variable from the environment, falling back to the default. */
export function resolvePort(environment = process.env, variable) {
  const raw = environment[variable];
  const value = raw === undefined || raw.trim() === '' ? DEFAULT_PORTS[variable] : Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`Invalid port value for ${variable}: ${JSON.stringify(raw)}`);
  }
  return value;
}

/** All infrastructure ports as `{ variable, port }`, defaults overridable via `.env`. */
export function resolveInfrastructurePorts(environment = process.env) {
  return INFRASTRUCTURE_PORT_VARIABLES.map((variable) => ({
    variable,
    port: resolvePort(environment, variable),
  }));
}

/**
 * Checks whether a host port can be connected to on 127.0.0.1.
 * Resolves `true` when something is listening, `false` when free.
 */
export function isPortInUse(port, { host = '127.0.0.1', timeoutMs = 500, connector } = {}) {
  const connect =
    connector ?? ((options, handler) => net.connect(options).once('connect', handler));
  return new Promise((resolvePortCheck) => {
    const onClose = () => resolvePortCheck(false);
    let settled = false;
    const settle = (inUse) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket?.destroy();
      resolvePortCheck(inUse);
    };
    let socket;
    let timer;
    try {
      socket = connect({ host, port }, () => settle(true));
      socket.once('error', onClose);
      socket.once('close', () => settle(false));
      timer = setTimeout(() => settle(false), timeoutMs);
    } catch {
      settle(false);
    }
  });
}

/**
 * Extracts the set of host ports published by this project's running Compose
 * containers, from `docker compose ps --format json` output (which may be a JSON
 * array or one JSON object per line — both are accepted).
 */
export function projectHostPortsFromComposePs(text) {
  const ports = new Set();
  const trimmed = String(text).trim();
  if (trimmed === '') return ports;

  let entries;
  try {
    const parsed = JSON.parse(trimmed);
    entries = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    entries = trimmed
      .split(/\r?\n/)
      .filter((line) => line.trim() !== '')
      .map((line) => JSON.parse(line));
  }

  for (const entry of entries) {
    for (const publisher of entry?.Publishers ?? []) {
      if (Number.isInteger(publisher?.PublishedPort)) ports.add(publisher.PublishedPort);
    }
    const legacyPorts = entry?.Ports;
    const legacyPortList = Array.isArray(legacyPorts)
      ? legacyPorts
      : legacyPorts
        ? [legacyPorts]
        : [];
    for (const port of legacyPortList) {
      // Fallback shape: "0.0.0.0:3306->3306/tcp"
      const match = /(?:^|,)0\.0\.0\.0:(\d+)->/.exec(String(port));
      if (match) ports.add(Number(match[1]));
    }
  }
  return ports;
}

/**
 * Ensures every `{ variable, port }` is usable: free on the host, or bound by
 * this project's own Compose stack. Throws `PortConflictError` otherwise.
 */
export async function assertInfrastructurePortsAvailable(
  ports,
  { isPortInUseFn = isPortInUse, getProjectPorts },
) {
  for (const { variable, port } of ports) {
    if ((await isPortInUseFn(port)) === false) continue;
    const projectPorts = getProjectPorts ? await getProjectPorts() : new Set();
    if (!projectPorts.has(port)) {
      throw new PortConflictError(variable, port);
    }
  }
}
