'use client';

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { PageLoader } from "@/components/ui/PageLoader";
import { MemoryStagesWidget } from "@/components/features/dashboard/MemoryStagesWidget";
import { ReviewForecastWidget } from "@/components/features/dashboard/ReviewForecastWidget";
import { IntervalStatsWidget } from "@/components/features/dashboard/IntervalStatsWidget";
import { ActivityHeatmapWidget } from "@/components/features/dashboard/ActivityHeatmapWidget";
import { HeroCTAWidget } from "@/components/features/dashboard/HeroCTAWidget";
import { useDashboardStats, useIntervalStats, useActivityHistory, useRegistrationOpen, type ForecastHorizon } from "@/lib/hooks";
import { api, ApiError } from "@/lib/api";

function AuthenticatedContent() {
  const timeZone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";
  const [forecastHorizon, setForecastHorizon] = useState<ForecastHorizon>("30d");
  const { data: stats } = useDashboardStats(timeZone, forecastHorizon);
  const { data: intervals } = useIntervalStats(timeZone);
  const { data: activity } = useActivityHistory(timeZone);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 animate-fade-in-up">
        {stats && (
          <div className="mb-8">
            <HeroCTAWidget dueNow={stats.dueNow} nextDueAt={stats.nextDueAt} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            {stats && (
              <ReviewForecastWidget
                data={stats.reviewForecast}
                timeZone={timeZone}
                horizon={forecastHorizon}
                onHorizonChange={setForecastHorizon}
              />
            )}
            {activity && (
              <ActivityHeatmapWidget data={activity} timeZone={timeZone} />
            )}
          </div>

          <div className="lg:col-span-1 flex flex-col gap-6">
            {intervals && (
              <IntervalStatsWidget data={intervals} />
            )}
            {stats && (
              <MemoryStagesWidget data={stats.memoryStages} />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function AuthForm({
  email,
  setEmail,
  password,
  setPassword,
  name,
  setName,
  isRegister,
  onSubmit,
  submitLabel,
  error,
  pending,
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  isRegister: boolean;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  error: string;
  pending: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isRegister && (
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1.5">
            Name <span className="text-text-tertiary">(optional)</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border-primary bg-surface-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-sm"
            placeholder="Your name"
          />
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1.5">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          className="w-full px-3 py-2 rounded-lg border border-border-primary bg-surface-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-sm"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1.5">
          Password
          {isRegister && <span className="text-text-tertiary"> (min 8 characters)</span>}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={isRegister ? 8 : undefined}
          className="w-full px-3 py-2 rounded-lg border border-border-primary bg-surface-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-sm"
          placeholder="••••••••"
        />
      </div>
      {error && (
        <p className="text-sm text-accent-error">{error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-accent-primary text-text-inverse py-2.5 rounded-lg font-medium hover:bg-accent-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {pending ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}

function SignInPage() {
  const { data: regStatus } = useRegistrationOpen();
  const isRegister = regStatus?.open === true;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      if (isRegister) {
        await api.post("/api/auth/register", { email, password, name });
      }
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password.");
      }
      // On success, the session updates and the page re-renders to AuthenticatedContent.
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message :
        err instanceof Error ? err.message :
        "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 animate-fade-in-up">
        <div className="max-w-2xl w-full mx-auto text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4">
            Flashcards
          </h1>
          <p className="text-xl text-text-secondary mb-2">
            A lightweight study tool that does one thing well.
          </p>
          <p className="text-text-secondary mb-6">
            Create decks, study cards, and let spaced repetition schedule reviews so you remember what matters.
          </p>
        </div>

        <div className="w-full max-w-md">
          <div className="bg-surface-primary border border-border-primary rounded-xl p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-text-primary mb-6 text-center">
              {isRegister ? "Create your account" : "Sign in"}
            </h2>

            {isRegister && (
              <p className="text-sm text-text-tertiary mb-4 text-center">
                No accounts exist yet — create the first one to get started.
                Registration closes after this.
              </p>
            )}

            <AuthForm
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              name={name}
              setName={setName}
              isRegister={isRegister}
              onSubmit={handleSubmit}
              submitLabel={isRegister ? "Create account" : "Sign in"}
              error={error}
              pending={pending}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function HomePage() {
  const { status } = useSession();

  if (status === "loading") return <PageLoader fullScreen />;
  if (status === "unauthenticated") return <SignInPage />;
  return <AuthenticatedContent />;
}