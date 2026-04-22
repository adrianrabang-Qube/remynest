'use client'

import { useState } from 'react'

export default function Home() {
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [date, setDate] = useState('')

  const createReminder = async () => {
    console.log('Creating reminder...')

    const res = await fetch('/api/create-reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        title,
        message,
        remind_at: date,
      }),
    })

    const data = await res.json()
    console.log('Reminder response:', data)
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Remydr</h1>

      <input
        placeholder="Enter email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br /><br />

      <button>Login / Sign up</button>

      <br /><br /><br />

      <h3>Create Reminder</h3>

      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <br /><br />

      <input
        placeholder="Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <br /><br />

      <input
        type="datetime-local"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <br /><br />

      <button onClick={createReminder}>
        Create Reminder
      </button>
    </main>
  )
}