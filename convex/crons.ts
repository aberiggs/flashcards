import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup expired ai image jobs",
  { hours: 2 },
  internal.aiImage.cleanupExpiredImageJobs
);

export default crons;
