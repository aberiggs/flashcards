import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession } from "next-auth/react";
import type { ConfidenceLevel } from "@/lib/sm2";

// ── Types (mirror server responses) ──────────────────────────────────────────────

export interface DeckWithStats {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  cardCount: number;
  dueCount: number;
  lastStudied: number | null;
  nextReviewAt: number | null;
}

export interface Deck {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: number;
  deckId: number;
  front: string;
  back: string;
  efactor: number;
  repetitions: number;
  nextReview: string;
  lastStudied: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeckWithCards extends Deck {
  cards: Card[];
}

export interface MemoryStages {
  new: number;
  learning: number;
  reviewing: number;
  mastered: number;
}

export interface ReviewForecast {
  today: number;
  tomorrow: number;
  in3Days: number;
  in7Days: number;
}

export interface DashboardStats {
  memoryStages: MemoryStages;
  reviewForecast: ReviewForecast;
}

export interface GamificationStats {
  streak: number;
  todayCards: number;
  weekCards: number;
  accuracyRate: number | null;
}

export interface SearchResult {
  decks: {
    id: number;
    name: string;
    description: string | null;
    cardCount: number;
  }[];
  cards: {
    id: number;
    front: string;
    back: string;
    deckId: number;
    deckName: string;
  }[];
}

// ── Query keys ───────────────────────────────────────────────────────────────────

const qk = {
  decks: ["decks"] as const,
  deck: (id: number) => ["decks", id] as const,
  deckCards: (id: number) => ["decks", id, "cards"] as const,
  dueCards: (id: number) => ["decks", id, "due"] as const,
  deckStats: (id: number) => ["decks", id, "stats"] as const,
  dashboardStats: (tz: string) => ["stats", "dashboard", tz] as const,
  gamification: (tz: string) => ["stats", "gamification", tz] as const,
  activity: (tz: string) => ["stats", "activity", tz] as const,
  search: (q: string) => ["search", q] as const,
};

// ── Hooks: decks ─────────────────────────────────────────────────────────────────

export function useDecks() {
  const { status } = useSession();
  return useQuery({
    queryKey: qk.decks,
    queryFn: () => api.get<DeckWithStats[]>("/api/decks"),
    enabled: status === "authenticated",
  });
}

export function useDeck(deckId: number) {
  const { status } = useSession();
  return useQuery({
    queryKey: qk.deck(deckId),
    queryFn: () => api.get<DeckWithCards>(`/api/decks/${deckId}`),
    enabled: status === "authenticated",
  });
}

export function useCreateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) =>
      api.post<{ id: number }>("/api/decks", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.decks }),
  });
}

export function useUpdateDeck(deckId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; description?: string }) =>
      api.patch<{ ok: true }>(`/api/decks/${deckId}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.deck(deckId) });
      qc.invalidateQueries({ queryKey: qk.decks });
    },
  });
}

export function useDeleteDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deckId: number) =>
      api.delete<{ ok: true }>(`/api/decks/${deckId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.decks }),
  });
}

// ── Hooks: cards ─────────────────────────────────────────────────────────────────

export function useCards(deckId: number) {
  const { status } = useSession();
  return useQuery({
    queryKey: qk.deckCards(deckId),
    queryFn: () => api.get<Card[]>(`/api/decks/${deckId}/cards`),
    enabled: status === "authenticated",
  });
}

export function useDueCards(deckId: number) {
  const { status } = useSession();
  return useQuery({
    queryKey: qk.dueCards(deckId),
    queryFn: () =>
      api.get<Card[]>(`/api/decks/${deckId}/cards?due=true`),
    enabled: status === "authenticated",
  });
}

export function useCreateCard(deckId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { front: string; back: string }) =>
      api.post<{ id: number }>(`/api/decks/${deckId}/cards`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.deckCards(deckId) });
      qc.invalidateQueries({ queryKey: qk.dueCards(deckId) });
      qc.invalidateQueries({ queryKey: qk.deck(deckId) });
      qc.invalidateQueries({ queryKey: qk.decks });
      qc.invalidateQueries({ queryKey: qk.deckStats(deckId) });
    },
  });
}

export function useUpdateCard(deckId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      cardId: number;
      front?: string;
      back?: string;
    }) =>
      api.patch<{ ok: true }>(
        `/api/decks/${deckId}/cards/${input.cardId}`,
        { front: input.front, back: input.back }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.deckCards(deckId) });
      qc.invalidateQueries({ queryKey: qk.deck(deckId) });
    },
  });
}

export function useRecordReview(deckId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { cardId: number; confidence: ConfidenceLevel }) =>
      api.patch<{ ok: true }>(
        `/api/decks/${deckId}/cards/${input.cardId}`,
        { confidence: input.confidence }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.deckCards(deckId) });
      qc.invalidateQueries({ queryKey: qk.dueCards(deckId) });
      qc.invalidateQueries({ queryKey: qk.deckStats(deckId) });
      qc.invalidateQueries({ queryKey: qk.decks });
    },
  });
}

export function useDeleteCard(deckId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: number) =>
      api.delete<{ ok: true }>(`/api/decks/${deckId}/cards/${cardId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.deckCards(deckId) });
      qc.invalidateQueries({ queryKey: qk.dueCards(deckId) });
      qc.invalidateQueries({ queryKey: qk.deck(deckId) });
      qc.invalidateQueries({ queryKey: qk.decks });
      qc.invalidateQueries({ queryKey: qk.deckStats(deckId) });
    },
  });
}

// ── Hooks: study sessions ────────────────────────────────────────────────────────

export function useStartSession(deckId: number) {
  return useMutation({
    mutationFn: () => api.post<{ id: number }>(`/api/decks/${deckId}/study`),
  });
}

export function useCompleteSession(deckId: number) {
  return useMutation({
    mutationFn: (input: {
      sessionId: number;
      cardsStudied: number;
      cardsCorrect: number;
      cardsIncorrect: number;
    }) => api.patch<{ ok: true }>(`/api/decks/${deckId}/study`, input),
  });
}

// ── Hooks: stats ─────────────────────────────────────────────────────────────────

export function useDashboardStats(timeZone: string) {
  const { status } = useSession();
  return useQuery({
    queryKey: qk.dashboardStats(timeZone),
    queryFn: () =>
      api.get<DashboardStats>(`/api/stats/dashboard?tz=${encodeURIComponent(timeZone)}`),
    enabled: status === "authenticated",
  });
}

export function useGamificationStats(timeZone: string) {
  const { status } = useSession();
  return useQuery({
    queryKey: qk.gamification(timeZone),
    queryFn: () =>
      api.get<GamificationStats>(`/api/stats/gamification?tz=${encodeURIComponent(timeZone)}`),
    enabled: status === "authenticated",
  });
}

export function useActivityHistory(timeZone: string) {
  const { status } = useSession();
  return useQuery({
    queryKey: qk.activity(timeZone),
    queryFn: () =>
      api.get<Record<string, number>>(`/api/stats/activity?tz=${encodeURIComponent(timeZone)}`),
    enabled: status === "authenticated",
  });
}

export function useDeckStats(deckId: number, timeZone: string) {
  const { status } = useSession();
  return useQuery({
    queryKey: qk.deckStats(deckId),
    queryFn: () =>
      api.get<DashboardStats>(
        `/api/decks/${deckId}/stats?tz=${encodeURIComponent(timeZone)}`
      ),
    enabled: status === "authenticated",
  });
}

// ── Hooks: search ────────────────────────────────────────────────────────────────

export function useSearch(query: string, enabled: boolean) {
  const { status } = useSession();
  return useQuery({
    queryKey: qk.search(query),
    queryFn: () =>
      api.get<SearchResult>(`/api/search?q=${encodeURIComponent(query)}`),
    enabled: status === "authenticated" && enabled,
    staleTime: 10_000,
  });
}

// ── Hooks: import ────────────────────────────────────────────────────────────────

export interface ImportCardInput {
  front: string;
  back: string;
  efactor?: number;
  repetitions?: number;
  nextReview?: number;
  lastStudied?: number;
}

export function useImportDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      description?: string;
      cards: ImportCardInput[];
    }) => api.post<{ id: number }>("/api/import", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.decks }),
  });
}