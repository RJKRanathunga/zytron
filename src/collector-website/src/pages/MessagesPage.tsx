import { useState } from 'react'
import { useCollectorApp } from '../hooks/useCollectorApp'

export function MessagesPage() {
  const app = useCollectorApp()
  const [activeThreadId, setActiveThreadId] = useState(app.messages[0]?.id ?? '')
  const [message, setMessage] = useState('')
  const activeThread = app.messages.find((thread) => thread.id === activeThreadId) ?? app.messages[0]

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Messages</span>
          <h1>Coordinate pickups with collection-point owners.</h1>
          <p>Keep access notes, time changes and handover confirmations attached to your collector workflow.</p>
        </div>
      </section>

      <section className="message-layout">
        <aside className="panel thread-list" aria-label="Message threads">
          {app.messages.map((thread) => (
            <button
              className={`thread ${thread.id === activeThread?.id ? 'active' : ''}`}
              key={thread.id}
              type="button"
              onClick={() => setActiveThreadId(thread.id)}
            >
              <span className="request-avatar">{thread.initials}</span>
              <span>
                <strong>{thread.participant}</strong>
                <small>{thread.lastMessage}</small>
              </span>
              {thread.unread > 0 ? <span className="pill coral">{thread.unread}</span> : null}
            </button>
          ))}
        </aside>
        <article className="panel conversation">
          {activeThread ? (
            <>
              <div className="conversation-head">
                <span className="request-avatar">{activeThread.initials}</span>
                <div>
                  <strong>{activeThread.participant}</strong>
                  <small>{activeThread.role}</small>
                </div>
              </div>
              <div className="chat-stack">
                <p className="chat-bubble other">{activeThread.lastMessage}</p>
                <p className="chat-bubble mine">Thanks. I will confirm when the vehicle leaves the yard.</p>
              </div>
              <form
                className="message-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!message.trim() || !activeThread) return
                  app.sendMessage(activeThread.id, message.trim())
                  setMessage('')
                }}
              >
                <label className="sr-only" htmlFor="collector-message">
                  Message
                </label>
                <input
                  id="collector-message"
                  placeholder="Type pickup update"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
                <button className="btn primary" type="submit">
                  Send
                </button>
              </form>
            </>
          ) : null}
        </article>
      </section>
    </div>
  )
}
