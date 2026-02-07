'use client';

import Link from "next/link";
import { Settings, LogOut } from "lucide-react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";

function AuthenticatedContent() {
  const { signOut } = useAuthActions();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border-primary bg-surface-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-text-primary">
              Flashcards App
            </h1>
            <div className="flex items-center space-x-4">
              <Link
                href="/options"
                className="text-text-secondary hover:text-text-primary transition-colors"
                title="Options & Settings"
              >
                <Settings className="w-6 h-6" aria-hidden />
              </Link>
              <button
                onClick={() => void signOut()}
                className="cursor-pointer text-text-secondary hover:text-text-primary transition-colors"
                title="Sign out"
              >
                <LogOut className="w-6 h-6" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Welcome to Flashcards
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Create, organize, and study flashcards to enhance your learning experience.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-surface-primary border border-border-primary rounded-lg p-6 shadow-sm">
            <div className="text-3xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              Create Cards
            </h3>
            <p className="text-text-secondary">
              Build custom flashcards with questions and answers.
            </p>
          </div>

          <div className="bg-surface-primary border border-border-primary rounded-lg p-6 shadow-sm">
            <div className="text-3xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              Study Mode
            </h3>
            <p className="text-text-secondary">
              Practice with interactive study sessions and progress tracking.
            </p>
          </div>

          <div className="bg-surface-primary border border-border-primary rounded-lg p-6 shadow-sm">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              Track Progress
            </h3>
            <p className="text-text-secondary">
              Monitor your learning progress and identify areas for improvement.
            </p>
          </div>
        </div>

        {/* View Decks */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/decks"
            className="inline-flex items-center justify-center px-6 py-3 border border-border-primary text-base font-medium rounded-md text-text-inverse bg-accent-primary hover:bg-accent-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-primary transition-colors"
          >
            View Decks
          </Link>
        </div>
      </main>
    </div>
  );
}

function SignInPage() {
  const { signIn } = useAuthActions();

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            Flashcards
          </h1>
          <p className="text-lg text-text-secondary">
            Create, organize, and study flashcards to enhance your learning.
          </p>
        </div>

        <div className="bg-surface-primary border border-border-primary rounded-lg p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-text-primary mb-6 text-center">
            Sign in to get started
          </h2>

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
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <p className="text-text-secondary">Loading...</p>
        </div>
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
