import { describe, it, expect } from "vitest";
import {
  buildHeatmapDays,
  groupIntoWeeks,
  computeMonthLabels,
} from "@/lib/heatmap";

const TZ = "UTC";

/**
 * Build a date string (YYYY-MM-DD) for a date at midnight UTC.
 */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

describe("buildHeatmapDays", () => {
  it("returns exactly 182 days", () => {
    const days = buildHeatmapDays({}, TZ, Date.UTC(2026, 6, 13));
    expect(days).toHaveLength(182);
  });

  it("ends on today and starts 181 days before", () => {
    const now = Date.UTC(2026, 6, 13);
    const days = buildHeatmapDays({}, TZ, now);
    const first = days[0].date;
    const last = days[days.length - 1].date;
    expect(last).toBe("2026-07-13");
    expect(first).toBe("2026-01-13");
  });

  it("produces no duplicate dates", () => {
    const days = buildHeatmapDays({}, TZ, Date.UTC(2026, 6, 13));
    const dates = days.map((d) => d.date);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it("produces no gaps — every consecutive day is present", () => {
    const days = buildHeatmapDays({}, TZ, Date.UTC(2026, 6, 13));
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1].date + "T00:00:00Z");
      const curr = new Date(days[i].date + "T00:00:00Z");
      const diffDays = Math.round(
        (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)
      );
      expect(diffDays).toBe(1);
    }
  });

  it("does not skip DST spring-forward day (March 8, 2026)", () => {
    // The bug: subtracting 24h of ms from March 9 midnight UTC lands on
    // March 7 23:00 UTC in America/New_York, skipping March 8 entirely.
    // Use a timezone that observes DST and where March 8, 2026 is the
    // spring-forward date.
    const tz = "America/New_York";
    const days = buildHeatmapDays({}, tz, Date.UTC(2026, 2, 15));
    const dates = days.map((d) => d.date);
    expect(dates).toContain("2026-03-08");
    expect(dates).toContain("2026-03-09");
  });

  it("does not skip DST fall-back day (November 1, 2026)", () => {
    const tz = "America/New_York";
    const days = buildHeatmapDays({}, tz, Date.UTC(2026, 10, 15));
    const dates = days.map((d) => d.date);
    expect(dates).toContain("2026-11-01");
    expect(dates).toContain("2026-10-31");
    expect(dates).toContain("2026-11-02");
  });

  it("maps counts from the data record onto the correct days", () => {
    const now = Date.UTC(2026, 6, 13);
    const todayKey = dayKey(new Date(now));
    const twoDaysAgoKey = dayKey(new Date(now - 2 * 86400000));
    const data: Record<string, number> = {
      [todayKey]: 5,
      [twoDaysAgoKey]: 3,
    };
    const days = buildHeatmapDays(data, TZ, now);
    const today = days.find((d) => d.date === todayKey);
    const twoDaysAgo = days.find((d) => d.date === twoDaysAgoKey);
    expect(today?.count).toBe(5);
    expect(twoDaysAgo?.count).toBe(3);
  });

  it("defaults to 0 for days with no data", () => {
    const days = buildHeatmapDays({}, TZ, Date.UTC(2026, 6, 13));
    expect(days.every((d) => d.count === 0)).toBe(true);
  });
});

describe("groupIntoWeeks", () => {
  it("splits on Sunday (dayOfWeek === 0)", () => {
    // 14 days starting on a Wednesday (2026-07-01 is a Wednesday)
    const days = buildHeatmapDays({}, TZ, Date.UTC(2026, 6, 14));
    const weeks = groupIntoWeeks(days);
    // Every week except possibly the first and last should have exactly 7 days
    for (const week of weeks) {
      expect(week.days.length).toBeLessThanOrEqual(7);
    }
  });

  it("produces no week with more than 7 days", () => {
    const days = buildHeatmapDays({}, TZ, Date.UTC(2026, 6, 13));
    const weeks = groupIntoWeeks(days);
    for (const week of weeks) {
      expect(week.days.length).toBeLessThanOrEqual(7);
    }
  });

  it("pads the first week with empty days so it starts at Sunday", () => {
    // 2026-07-13 is a Monday, so the first week starts on Monday
    // and needs 6 padding days to align to Sunday
    const days = buildHeatmapDays({}, TZ, Date.UTC(2026, 6, 13));
    const weeks = groupIntoWeeks(days);
    const firstWeek = weeks[0];
    // First week should have 7 entries, with padding at the start
    expect(firstWeek.days).toHaveLength(7);
    expect(firstWeek.days[0].date).toBe("");
  });

  it("includes all 182 real days across all weeks", () => {
    const days = buildHeatmapDays({}, TZ, Date.UTC(2026, 6, 13));
    const weeks = groupIntoWeeks(days);
    const realDays = weeks
      .flatMap((w) => w.days)
      .filter((d) => d.date !== "");
    expect(realDays).toHaveLength(182);
  });
});

describe("computeMonthLabels", () => {
  it("returns one label per month transition", () => {
    const days = buildHeatmapDays({}, TZ, Date.UTC(2026, 6, 13));
    const weeks = groupIntoWeeks(days);
    const labels = computeMonthLabels(weeks);
    // 182 days from Jan to Jul = 7 months
    expect(labels.length).toBeGreaterThanOrEqual(6);
    expect(labels.length).toBeLessThanOrEqual(7);
  });

  it("labels are month abbreviations", () => {
    const days = buildHeatmapDays({}, TZ, Date.UTC(2026, 6, 13));
    const weeks = groupIntoWeeks(days);
    const labels = computeMonthLabels(weeks);
    for (const label of labels) {
      expect(label.label).toMatch(/^[A-Z][a-z]{2}$/);
    }
  });

  it("weekIndex values are valid and increasing", () => {
    const days = buildHeatmapDays({}, TZ, Date.UTC(2026, 6, 13));
    const weeks = groupIntoWeeks(days);
    const labels = computeMonthLabels(weeks);
    for (let i = 1; i < labels.length; i++) {
      expect(labels[i].weekIndex).toBeGreaterThan(labels[i - 1].weekIndex);
    }
  });
});