import Link from "next/link";

// Settings icon component
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export default function HomePage() {
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
                <SettingsIcon className="w-6 h-6" />
              </Link>
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
