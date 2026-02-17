# Connect Four — Online Multiplayer

A retro-arcade Connect Four game with online multiplayer and AI opponents. Mobile-first, deployable on Vercel for free.

## Stack

- **Frontend**: Next.js 14 + Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: Upstash Redis (free tier — 10K commands/day)
- **AI**: Client-side minimax with alpha-beta pruning (no API needed)
- **Audio**: Web Audio API (zero dependencies)

## Deploy to Vercel (5 minutes)

### 1. Create Upstash Redis

1. Go to [console.upstash.com](https://console.upstash.com)
2. Sign up free (no credit card needed)
3. Click **Create Database**
4. Pick any name and the region closest to your friends
5. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 2. Deploy to Vercel

1. Push this project to a GitHub repo
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repo
4. In **Environment Variables**, add:
   - `UPSTASH_REDIS_REST_URL` → paste URL from step 1
   - `UPSTASH_REDIS_REST_TOKEN` → paste token from step 1
5. Click **Deploy**

That's it. Share the URL with friends.

**Even easier**: Vercel has an Upstash integration. During project setup, click **Browse Marketplace** → **Upstash Redis** and it auto-provisions and sets the env vars for you.

### 3. Run Locally (optional)

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your Upstash credentials
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## How to Play

### VS Computer
Pick a difficulty (Rookie / Standard / Brutal) and play instantly. AI runs in your browser — no server calls.

### Online Multiplayer
1. Player A: **Create Room** → enter name → gets a 4-letter code
2. Player B: Enter code → **Join Room** → enter name → game starts
3. Winner goes first next round
4. Room stays open for unlimited rematches

## Features

- 🎮 Retro arcade aesthetic with pixel font and scanlines
- 🎵 Sound effects via Web Audio API (drop, land, win, lose)
- 🎉 Confetti on wins
- 📱 Mobile-first with touch optimization and haptic feedback
- 🏆 Running W-D-L scoreboard with player names
- 🤖 3 AI difficulty levels (minimax with alpha-beta pruning)
- 🔄 Winner goes first in rematches
- ⏱ Rooms auto-expire after 4 hours

## Cost

**$0/month** for casual use:
- Vercel: Free hobby tier
- Upstash: Free tier (10K commands/day ≈ ~100 games/day)

If you play a lot, Upstash pay-as-you-go is $0.20 per 100K commands.

## Project Structure

```
├── app/
│   ├── api/room/route.js   # Game API (create/join/move/rematch)
│   ├── globals.css          # Tailwind + animations
│   ├── layout.js            # HTML shell + mobile meta
│   └── page.js              # Entry point
├── components/
│   ├── Game.jsx             # Main game UI
│   └── Confetti.jsx         # Win effect
├── lib/
│   ├── ai.js                # Minimax AI engine
│   ├── api-client.js        # Frontend API wrapper
│   ├── game.js              # Shared game logic
│   ├── redis.js             # Upstash client
│   └── sounds.js            # Web Audio sound effects
└── .env.example
```
