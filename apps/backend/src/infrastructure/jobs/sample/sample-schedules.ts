import {
  defineScheduledJob,
  type RegisteredSchedule,
} from '../scheduling/scheduled-job.definition.js';
import type { SampleEchoPayload } from './sample-jobs.js';

/**
 * Sample periodic trigger (FND-007).
 *
 * Once per interval the Scheduler enqueues a `sample.echo` job — nothing more.
 * It exists to prove that scheduled work uses the same queue and Worker as
 * manually enqueued work, and it carries no business meaning.
 */
const periodicEchoSchedule = defineScheduledJob<SampleEchoPayload>({
  type: 'sample.periodic-echo',
  jobType: 'sample.echo',
  intervalMs: 60_000,
  payload: () => ({ message: 'periodic sample trigger' }),
});

export const SAMPLE_SCHEDULES: readonly RegisteredSchedule[] = [periodicEchoSchedule];
