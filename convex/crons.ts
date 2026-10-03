import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

// Files generated or uploaded but never published (architecture §7).
crons.cron(
  "cleanup orphan files",
  "0 4 * * *", // 04:00 UTC daily
  internal.ai.generations.cleanupOrphans,
  {},
);

export default crons;
