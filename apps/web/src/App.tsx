import { useEffect, useState } from 'react'
import './App.css'

type Connection =
  | { status: 'checking' }
  | { status: 'connected'; service: string }
  | { status: 'error' }

function App() {
  const [connection, setConnection] = useState<Connection>({ status: 'checking' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const timeout = window.setTimeout(() => controller.abort(), 8000)

    async function checkApi() {
      try {
        const response = await fetch('http://localhost:3000/health', {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('The health request failed.')
        }

        const data: unknown = await response.json()
        if (
          typeof data !== 'object' ||
          data === null ||
          !('status' in data) ||
          data.status !== 'ok' ||
          !('service' in data) ||
          typeof data.service !== 'string'
        ) {
          throw new Error('The health response is invalid.')
        }

        if (active) {
          setConnection({ status: 'connected', service: data.service })
        }
      } catch {
        if (active) {
          setConnection({ status: 'error' })
        }
      } finally {
        window.clearTimeout(timeout)
      }
    }

    void checkApi()

    return () => {
      active = false
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [attempt])

  function retry() {
    setConnection({ status: 'checking' })
    setAttempt((current) => current + 1)
  }

  return (
    <main className="page">
      <header className="page-header">
        <span className="brand-mark" aria-hidden="true">RL</span>
        <p className="eyebrow">Foundation / Checkpoint A</p>
        <h1>ReturnLedger</h1>
        <p className="intro">
          Refund reconciliation with a clear investigation history.
        </p>
      </header>

      <section className="connection-card" aria-labelledby="connection-title">
        <p className="eyebrow">Connection status</p>
        <div role="status" aria-live="polite">
          <h2 id="connection-title">
            <span className={`status-dot ${connection.status}`} aria-hidden="true" />
            {connection.status === 'checking'
              ? 'Checking API…'
              : connection.status === 'connected'
                ? 'API connected'
                : 'API unavailable'}
          </h2>
          <p className="connection-message">
            {connection.status === 'connected'
              ? `${connection.service}: ok`
              : connection.status === 'checking'
                ? 'Connecting to the local server.'
                : 'Cannot connect to the API. Check that the server is running, then try again.'}
          </p>
        </div>
        {connection.status === 'error' && (
          <button type="button" onClick={retry}>Try again</button>
        )}
      </section>
    </main>
  )
}

export default App
