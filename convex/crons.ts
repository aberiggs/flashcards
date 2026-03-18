import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sweep orphaned uploads every 30 minutes.
// If a user uploads an image but abandons the flow before generateCards
// completes, the file and its tracking row would otherwise leak.
crons.interval(
  "cleanup orphaned uploads",
  { minutes: 30 },
  internal.ai.sweepOrphanedUploads
);

export default crons;
