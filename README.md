# Live Chat Messaging App

A real-time chat application built with Next.js, TypeScript, Convex, and Clerk.

## Prerequisites

Before running the application, you need to set up accounts and projects with:
- [Clerk](https://clerk.com/) (Authentication)
- [Convex](https://www.convex.dev/) (Database & Real-time backend)

## Setup Instructions

### 1. Environment Variables
Create a `.env.local` file in the root directory and add the following:

```env
# Convex
CONVEX_DEPLOYMENT=... # e.g., dev:example-123
NEXT_PUBLIC_CONVEX_URL=...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
CLERK_JWT_ISSUER_DOMAIN=... # Found in Clerk Dashboard -> JWT Templates -> Convex
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Convex Backend
In a separate terminal, start the Convex development server:
```bash
npx convex dev
```

### 4. Run Next.js Frontend
In another terminal, start the Next.js development server:
```bash
npm run dev
```

## Features
- **Real-time Messaging**: Instant message delivery via Convex subscriptions.
- **Clerk Auth**: Secure sign-up/login and user profile sync.
- **Presence**: Real-time online/offline status indicators.
- **Typing Indicators**: See when others are typing in a conversation.
- **Unread Badges**: Notification of new messages in the sidebar.
- **Group Chat**: Create and chat in multi-user groups.
- **Reactions & Deletions**: React to messages or delete your own.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Backend/DB**: Convex
- **Auth**: Clerk
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
