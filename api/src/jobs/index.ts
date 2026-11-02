import { banLiftJob } from "./ban-lift.job"
import { broadcastFanoutJob } from "./broadcast-fanout.job"
import { listingExpiryJob } from "./listing-expiry.job"
import { outboxJob } from "./outbox.job"
import { promotionEndJob } from "./promotion-end.job"
import type { Job } from "./scheduler"
import { subscriptionEndJob } from "./subscription-end.job"
import { subscriptionExpiringJob } from "./subscription-expiring.job"

/** Every scheduled job (A10), one `*.job.ts` file each. */
export const jobs: Job[] = [
  outboxJob,
  broadcastFanoutJob,
  listingExpiryJob,
  promotionEndJob,
  subscriptionEndJob,
  subscriptionExpiringJob,
  banLiftJob,
]
