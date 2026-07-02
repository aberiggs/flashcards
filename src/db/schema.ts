import {
  pgTable,
  bigint,
  text,
  timestamp,
  doublePrecision,
  integer,
} from "drizzle-orm/pg-core";

// ── Users ───────────────────────────────────────────────────────────────────────
// The only auth table. Credentials-only auth with JWT sessions — no DB session
// table, no accounts table, no OAuth. passwordHash is bcrypt.

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── App tables ──────────────────────────────────────────────────────────────────
// bigint PKs for compact URLs; userId is text to reference the auth users table.

export const decks = pgTable("decks", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const cards = pgTable("cards", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  deckId: bigint("deck_id", { mode: "number" })
    .notNull()
    .references(() => decks.id, { onDelete: "cascade" }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  efactor: doublePrecision("efactor").notNull().default(2.5),
  repetitions: integer("repetitions").notNull().default(0),
  nextReview: timestamp("next_review", { withTimezone: true }).notNull().defaultNow(),
  lastStudied: timestamp("last_studied", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const studySessions = pgTable("study_sessions", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  deckId: bigint("deck_id", { mode: "number" })
    .notNull()
    .references(() => decks.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cardsStudied: integer("cards_studied").notNull().default(0),
  cardsCorrect: integer("cards_correct").notNull().default(0),
  cardsIncorrect: integer("cards_incorrect").notNull().default(0),
});

// ── Inferred types ──────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Deck = typeof decks.$inferSelect;
export type NewDeck = typeof decks.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type StudySession = typeof studySessions.$inferSelect;
export type NewStudySession = typeof studySessions.$inferInsert;