import { Inject, Injectable } from '@nestjs/common';
import { UnknownJobTypeError } from './job.errors.js';
import type { RegisteredJob } from './job.definition.js';
import { JOB_DEFINITIONS } from './job.tokens.js';

/**
 * The set of job types a process can execute (FND-007).
 *
 * Registration happens once, through the `JOB_DEFINITIONS` provider, and a
 * duplicate type is rejected at startup rather than silently shadowing a job.
 * The Worker resolves every claimed envelope through this registry; an
 * unregistered type becomes a terminal failure instead of a crash.
 */
@Injectable()
export class JobRegistry {
  private readonly definitions = new Map<string, RegisteredJob>();

  constructor(@Inject(JOB_DEFINITIONS) definitions: readonly RegisteredJob[]) {
    for (const definition of definitions) {
      if (this.definitions.has(definition.type)) {
        throw new Error(`Duplicate job type registration: "${definition.type}"`);
      }

      this.definitions.set(definition.type, definition);
    }
  }

  get(type: string): RegisteredJob | undefined {
    return this.definitions.get(type);
  }

  /** Returns the definition or throws `UnknownJobTypeError`. */
  require(type: string): RegisteredJob {
    const definition = this.definitions.get(type);

    if (definition === undefined) {
      throw new UnknownJobTypeError(type);
    }

    return definition;
  }

  has(type: string): boolean {
    return this.definitions.has(type);
  }

  /** Registered types, for diagnostics and tests. */
  types(): readonly string[] {
    return [...this.definitions.keys()].sort();
  }
}
