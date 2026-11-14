/**
 * Static checks for the local monitoring stack (FND-017).
 *
 * Two questions, both answerable from file contents alone (so CI can run them
 * with no Docker and no .env):
 *
 * 1. **No secret material in the observability files.** A committed default
 *    password or literal token would defeat the whole deny-by-default scrape
 *    boundary (FND-016): anyone with the repo could scrape the endpoint.
 *    Flagged: the known dev token value, any literal after a
 *    password/token/secret/credentials key (interpolation `${...}` and empty
 *    values are fine), and `credentials:`-style inline bearer tokens.
 * 2. **Every observability port binds to localhost.** These are operator tools
 *    (metrics, dashboards, alert state) — none may publish a LAN-reachable
 *    port. Checked structurally: within each `profiles: ['observability']`
 *    service block of docker-compose.yml, every `- <host>:<container>` port
 *    line must start with `127.0.0.1:`.
 *
 * Pure functions over file contents, unit-tested beside this file; the runner
 * is `pnpm obs:check` (tooling/scripts/check-observability.mjs).
 */

/** Marker values that must never appear in a committed observability file. */
export const FORBIDDEN_LITERALS = ['dev-only-change-me-metrics'];

/** A `password:`/`token:`-style key followed by a literal (non-interpolated) value. */
const LITERAL_ASSIGNMENT = new RegExp(
  "(password|token|secret|api_?key|credentials)\\b['\"]?\\s*[:=]\\s*['\"]?((?!\\$\\{)\\S[^'\"#\\s]*)",
  'i',
);

/** Where the Compose services of the stack are declared. */
export const COMPOSE_FILE = 'docker-compose.yml';

/**
 * Checks one file's text; returns a list of human-readable violations.
 *
 * YAML comment lines are skipped (`#`-prefixed) so documentation inside the
 * files can *talk about* tokens and passwords without tripping the check.
 */
export function checkFileContent(content) {
  const violations = [];

  for (const literal of FORBIDDEN_LITERALS) {
    if (content.includes(literal)) {
      violations.push(`contains the dev default value "${literal}"`);
    }
  }

  for (const [index, rawLine] of content.split(/\r?\n/).entries()) {
    const line = rawLine.trim();

    if (line === '' || line.startsWith('#')) {
      continue;
    }

    const match = LITERAL_ASSIGNMENT.exec(line);

    if (match !== null && !isAcceptableValue(match[2])) {
      violations.push(`line ${index + 1}: literal value after "${match[1]}"`);
    }
  }

  return violations;
}

/**
 * Values that are not secret material: empty, Compose interpolation, an
 * env-var *reference*, or a path/key name (files and file references are how
 * both Prometheus and Alertmanager are configured to receive credentials).
 */
function isAcceptableValue(value) {
  const unquoted = value?.replace(/^['"]|['"]$/g, '') ?? '';

  return (
    unquoted === '' ||
    unquoted.includes('${') ||
    unquoted.startsWith('?') || // interpolation remainder, e.g. `:?required}`
    unquoted.startsWith('/') ||
    unquoted.startsWith('./') ||
    unquoted === 'file' ||
    unquoted === 'Bearer' ||
    unquoted === 'null' ||
    unquoted === 'false' ||
    unquoted === 'true'
  );
}

/**
 * Checks that every published port of every `observability`-profile service in
 * docker-compose.yml binds to 127.0.0.1. Only block structure matters: a
 * service block starts at `profiles: ['observability']` (or a service line
 * inside the observability section) and runs until the next two-space-indented
 * `something:` line at service level.
 */
export function checkComposePortBindings(composeText) {
  const violations = [];
  const lines = composeText.split(/\r?\n/);
  const servicePattern = /^ {2}([a-z][a-z0-9-]*):\s*$/;
  const portPattern = /^\s+-\s+'?([\w.:-]+)'?:\d+\/?\d*'?$/;

  let inObservabilityService = false;
  let currentService = null;

  for (const rawLine of lines) {
    const service = servicePattern.exec(rawLine);

    if (service !== null) {
      currentService = service[1];
      continue;
    }

    if (currentService !== null && /profiles:\s*\[.*'observability'/.test(rawLine)) {
      inObservabilityService = true;
      continue;
    }

    const port = portPattern.exec(rawLine);

    if (inObservabilityService && port !== null) {
      const host = port[1];

      if (host !== '127.0.0.1' && !/^127\.0\.0\.1/.test(host)) {
        violations.push(
          `service "${currentService}" publishes "${rawLine.trim()}" — must bind to 127.0.0.1`,
        );
      }
    }
  }

  return violations;
}
