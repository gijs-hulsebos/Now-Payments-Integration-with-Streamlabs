export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">NOWPayments to Streamlabs Webhook Bridge</h1>
        <p className="text-gray-600 mb-8 text-lg">
          The webhook server is currently running and listening for NOWPayments IPNs.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-6 text-left border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Configuration Status</h2>
          <ul className="space-y-3">
            <li className="flex items-center">
              <span className="w-4 h-4 rounded-full mr-3 flex-shrink-0 bg-green-500"></span>
              <span className="text-gray-700">Webhook Endpoint: <code className="bg-gray-200 px-2 py-1 rounded text-sm">POST /api/webhook</code></span>
            </li>
            <li className="flex items-center">
              <span className="w-4 h-4 rounded-full mr-3 flex-shrink-0 bg-blue-500"></span>
              <span className="text-gray-700">Environment Variables required in Settings:</span>
            </li>
            <ul className="ml-8 list-disc text-gray-600 text-sm space-y-1">
              <li><code className="font-mono">NOWPAYMENTS_IPN_SECRET</code></li>
              <li><code className="font-mono">STREAMLABS_ACCESS_TOKEN</code></li>
            </ul>
          </ul>
        </div>
      </div>
    </main>
  );
}
