export type Job = {
  name: string
  /** Cron expression, read in the Africa/Khartoum time zone. */
  schedule: string
  run: () => Promise<unknown>
}

/** Declares a scheduled job. A job file names its schedule and calls one service function (A17.3). */
export function defineJob(job: Job) {
  return job
}
