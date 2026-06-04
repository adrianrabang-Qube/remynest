# RemyNest Architecture

## Frontend

- Next.js
- TypeScript
- Tailwind CSS

---

## Backend

- Supabase

Services Used:

- PostgreSQL
- Authentication
- Storage
- Row Level Security

---

## External Services

### OpenAI

Used for:

- Memory Chat
- Insights
- AI summarization

### Stripe

Used for:

- Subscription billing
- Premium plans
- Family plans

### OneSignal

Used for:

- Push notifications
- Reminder notifications

---

## Core Domains

### Memories

Stores:

- Text memories
- Photos
- Attachments
- Metadata

### Timeline

Chronological memory browsing

### Insights

AI-generated analysis

### Memory Chat

Conversational memory retrieval

### Caregiver Collaboration

Shared profile access

### Billing

Subscription management

### Notifications

Reminder delivery

---

## Deployment

Hosting:
- Vercel

Database:
- Supabase

Source Control:
- GitHub

Production Branch:
- main

Development Branch:
- cognition-v2

Production deployments must remain stable.