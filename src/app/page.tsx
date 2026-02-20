'use client';

import Link from "next/link";
import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageLoader } from "@/components/ui/PageLoader";
import { MemoryStagesWidget } from "@/components/features/dashboard/MemoryStagesWidget";
import { ReviewForecastWidget } from "@/components/features/dashboard/ReviewForecastWidget";
import { StreakWidget } from "@/components/features/dashboard/StreakWidget";
import { ActivityHeatmapWidget } from "@/components/features/dashboard/ActivityHeatmapWidget";

function BuiltByFooter() {
  return (
    <footer className="mt-auto py-8 text-center">
      <a
        href="https://www.aberiggsiv.dev/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-text-tertiary text-sm hover:text-text-secondary transition-colors"
      >
        Built by Sprocket Riggs
      </a>
    </footer>
  );
}

function AuthenticatedContent() {
  const timeZone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";
  const stats = useQuery(api.stats.dashboardStats, { timeZone });
  const gamification = useQuery(api.stats.gamificationStats, { timeZone });
  const activity = useQuery(api.stats.activityHistory, { timeZone });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Welcome back
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mx-auto">
            Ready to study? Pick up where you left off or create a new deck.
          </p>
        </div>

        {/* Gamification widgets */}
        {gamification && (
          <div className="mb-6">
            <StreakWidget data={gamification} />
          </div>
        )}
        {activity && (
          <div className="mb-6">
            <ActivityHeatmapWidget data={activity} timeZone={timeZone} />
          </div>
        )}

        {/* Stats widgets */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <MemoryStagesWidget data={stats.memoryStages} />
            <ReviewForecastWidget data={stats.reviewForecast} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/decks"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-md text-text-inverse bg-accent-primary hover:bg-accent-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-primary transition-colors"
          >
            View Decks
          </Link>
        </div>
      </main>

      <BuiltByFooter />
    </div>
  );
}

function SignInPage() {
  const { signIn } = useAuthActions();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full mx-auto text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4">
            Flashcards
          </h1>
          <p className="text-xl text-text-secondary mb-2">
            A lightweight study tool that does one thing well.
          </p>
          <p className="text-text-secondary mb-6">
            Create decks, study cards, and let SM-2 schedule reviews so you remember what matters.
          </p>
          <p className="text-text-tertiary text-sm max-w-lg mx-auto">
            Built for learners who want to spend time studying—not wrestling with clunky UIs or fighting with card creation. Simple, focused, and designed so you can actually retain what you learn.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl w-full mb-12">
          <div className="bg-surface-primary border border-border-primary rounded-lg p-5 text-left">
            <div className="text-2xl mb-2">📚</div>
            <h3 className="font-semibold text-text-primary mb-1">Decks & Cards</h3>
            <p className="text-sm text-text-secondary">
              Straightforward deck and card creation—no setup headaches. Add front and back, edit or remove as needed.
            </p>
          </div>
          <div className="bg-surface-primary border border-border-primary rounded-lg p-5 text-left">
            <div className="text-2xl mb-2">🔄</div>
            <h3 className="font-semibold text-text-primary mb-1">Spaced Repetition</h3>
            <p className="text-sm text-text-secondary">
              SM-2 algorithm schedules reviews. Rate each card (wrong, close, hard, easy) and we handle the rest.
            </p>
          </div>
          <div className="bg-surface-primary border border-border-primary rounded-lg p-5 text-left">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold text-text-primary mb-1">Progress & Due Dates</h3>
            <p className="text-sm text-text-secondary">
              See due counts per deck, track when you last studied, and keep your reviews organized.
            </p>
          </div>
          <div className="bg-surface-primary border border-border-primary rounded-lg p-5 text-left">
            <div className="text-2xl mb-2">⚙️</div>
            <h3 className="font-semibold text-text-primary mb-1">Theme & Auth</h3>
            <p className="text-sm text-text-secondary">
              Light, dark, or system theme. Sign in with GitHub—your data stays private and scoped to you.
            </p>
          </div>
        </div>

        {/* Sign in CTA */}
        <div className="w-full max-w-md">
          <div className="bg-surface-primary border border-border-primary rounded-lg p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-text-primary mb-6 text-center">
              Sign in to get started
            </h2>

            <button
              onClick={() => void signIn("google")}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 border border-gray-300 py-3 px-4 rounded-md font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs text-gray-500">
                <span className="bg-surface-primary px-2">or</span>
              </div>
            </div>

            <button
              onClick={() => void signIn("github")}
              className="w-full flex items-center justify-center gap-3 bg-[#24292F] text-white py-3 px-4 rounded-md font-medium hover:bg-[#3b3f46] transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                  clipRule="evenodd"
                />
              </svg>
              Sign in with GitHub
            </button>
          </div>
        </div>
      </main>

      <BuiltByFooter />
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <AuthLoading>
        <PageLoader fullScreen />
      </AuthLoading>
      <Unauthenticated>
        <SignInPage />
      </Unauthenticated>
      <Authenticated>
        <AuthenticatedContent />
      </Authenticated>
    </>
  );
}
