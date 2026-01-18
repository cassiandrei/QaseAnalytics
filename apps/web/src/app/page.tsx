export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            QaseAnalytics
          </h1>
          <p className="text-xl text-gray-600">
            AI-powered analytics for your Qase.io QA metrics
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center text-gray-500">
            <p className="mb-4">Chat interface coming soon...</p>
            <p className="text-sm">
              Ask questions about your test metrics in natural language
            </p>
          </div>
        </div>

        <footer className="mt-12 text-center text-gray-400 text-sm">
          <p>Powered by GPT-5 + LangChain</p>
        </footer>
      </div>
    </main>
  );
}
