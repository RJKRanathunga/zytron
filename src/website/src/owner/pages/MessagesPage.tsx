import { useState } from 'react'
import { useOwnerApp } from '../hooks/useOwnerApp'

export function MessagesPage() {
  const app = useOwnerApp()
  const [activeThreadId, setActiveThreadId] = useState(app.messages[0]?.id ?? '')
  const [message, setMessage] = useState('')
  const activeThread = app.messages.find((thread) => thread.id === activeThreadId) ?? app.messages[0]

  return (
    <div className="page">
      <section className="heading">
        <div>
          <span className="eyebrow">Messages</span>
          <h1>Coordinate pickup access with collectors and support.</h1>
          <p>Keep pickup window changes, access details and device support messages in one place.</p>
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
                <p className="chat-bubble mine">Thanks. The collection point access desk has been informed.</p>
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
                <label className="sr-only" htmlFor="owner-message">
                  Message
                </label>
                <input
                  id="owner-message"
                  placeholder="Type owner update"
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
