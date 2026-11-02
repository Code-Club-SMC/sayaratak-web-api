import { banLiftJob } from "./ban-lift.job"
import { outboxJob } from "./outbox.job"
import { promotionEndJob } from "./promotion-end.job"
import type { Job } from "./scheduler"

/** Every scheduled job (A10), one `*.job.ts` file each. */
export const jobs: Job[] = [outboxJob, promotionEndJob, banLiftJob]
