# Embr

**A baby activity tracker with offline-first architecture, real-time cross-device sync, and animated card-based UI.**

![React Native](https://img.shields.io/badge/React_Native-0.79-61DAFB?logo=react&logoColor=white)
![Expo](https://img.shields.io/badge/Expo_SDK-53-000020?logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-iOS_|_Android-lightgrey?logo=apple&logoColor=white)

### Engineering Highlights

- **Offline-first with conflict resolution** — All activity data persists locally via AsyncStorage, syncs to Supabase when connectivity resumes
- **Real-time cross-device sync** — Supabase Realtime subscriptions push updates between caregiver devices instantly
- **Animated card system** — Reanimated-driven expandable activity cards with multi-timer support (concurrent nursing/bottle/sleep timers)
- **Modular feature architecture** — Vertical feature slices (`modules/activities`, `modules/auth`, `modules/storage`) with clean service boundaries
- **27 test files** with Jest + React Native Testing Library covering services, components, and integration flows

---

## What It Does

Embr tracks baby activities (nursing, bottle feeding, sleep, diaper changes, pumping, solids) with a timeline-based UI. Parents log events via animated expandable cards, view daily history on a visual timeline bar, and share data across devices in real time.

### Key Features

- **Multi-timer system** — Run concurrent timers for nursing (per-side tracking), sleep, and pumping with background persistence
- **Daily timeline** — Visual activity bar showing the day's events at a glance with drill-down detail lists
- **Onboarding wizard** — Baby profile setup with anonymous-first auth (upgrade to full account later)
- **Cross-device sync** — Both parents see updates in real time via Supabase Realtime channels
- **Offline resilience** — Full functionality without network; queued changes sync when connectivity returns

## Architecture

```
Expo SDK 53 + React Native 0.79
├── Expo Router V5           File-based routing with tab navigator
├── Legend State 2.1          Reactive state management
├── Supabase                  Auth, PostgreSQL, Realtime subscriptions
├── AsyncStorage              Offline-first persistence layer
├── NativeWind / Tailwind     Utility-first styling
└── Reanimated 3              Card animations and transitions
```

### Data Flow

```
User Action → Legend State (instant UI update)
                ├── AsyncStorage (local persistence)
                └── Supabase (remote sync when online)
                      └── Realtime → Other devices
```

Activities are written locally first for instant feedback, then synced to Supabase where row-level security ensures each family only sees their own data.

### Module Structure

```
frontend/
├── app/                     Expo Router screens (tabs: Home, Timeline, Settings)
├── modules/                 Vertical feature slices
│   ├── activities/          Activity types, services, timeline logic, card components
│   ├── auth/                Auth service, types, anonymous → full account upgrade
│   ├── dashboard/           Dashboard layout components
│   └── storage/             Persistence config, storage service abstraction
├── components/
│   ├── shared/              AnimatedActivityCard, BaseAnimatedCard, TimerComponent
│   ├── timeline/            DailyTimelineCard, ActivityTimelineBar, ActivityDetailsList
│   ├── auth/                AuthScreen, WelcomeScreen, ProfileUpgradePrompt
│   └── onboarding/          BabySetupWizard
├── state/                   Legend State stores (appState, cardStateManager, timeline)
├── services/                Supabase client, activity/baby/auth services
├── hooks/                   useActivityCard, useTimelineData, useUnifiedAuth
└── __tests__/               27 test files (unit + integration)
```

### Supabase Backend

- **2 migrations** defining the activity and baby profile schema
- **Row-level security** policies for family-scoped data isolation
- **Docker Compose** setup for local development with S3-compatible storage

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React Native 0.79, Expo SDK 53, Expo Router V5 |
| **Language** | TypeScript (strict mode) |
| **State** | Legend State 2.1 with reactive observables |
| **Styling** | NativeWind (Tailwind CSS for React Native) |
| **Animation** | Reanimated 3, PagerView |
| **Storage** | AsyncStorage (local), Supabase PostgreSQL (remote) |
| **Backend** | Supabase (Auth, Realtime, RLS policies) |
| **Testing** | Jest 30, React Native Testing Library |
| **CI/Quality** | ESLint, Prettier, TypeScript strict, 27 test suites |

## Development

```bash
cd frontend
npm install
npm run start              # Expo dev client
npm run lint               # ESLint
npm run typecheck           # TypeScript strict
npm run test               # Jest test suite
npm run test:coverage       # Coverage report
npm run build:development   # EAS development build
```

### Local Supabase

```bash
cd supabase-docker
docker compose up -d        # Start local Supabase
cd ../supabase
supabase db push            # Apply migrations
```

## License

MIT
