export default function ScoresLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-blue-800">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-4 text-center">
        <div className="mx-auto flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white">God&apos;s Men of Valor</h1>
        </div>
        <p className="mt-1 text-sm text-blue-200">Scoreboard</p>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {children}
      </main>
    </div>
  )
}
