# PulseChat 15 — Exclusive Real-Time Messaging & Admin Platform

PulseChat 15 is a full-featured, real-time messaging web application crafted in Material UI for private communities of up to 15 members. It combines the complete everyday workflow of WhatsApp—1-on-1 and group chats, voice notes, 24-hour status stories, rich media sharing, polls, voice-only calls, reactions, and read receipts—with a dedicated Admin Command Center for user governance, live moderation, and 16+ global color schemes.

### User Review & Critical Decisions

> [!IMPORTANT]
> All core product preferences from our clarification step have been locked into this specification:

- **Confirmed Membership Policy**: Open registration is enabled until the 15-member cap is reached, alongside manual member creation by the administrator (`admin` / `admin783`). Once 15 members are registered, self-registration automatically locks with a capacity notice.
- **Confirmed WhatsApp Feature Suite**: Includes 1-on-1 direct messages and custom group chats, voice note recording with waveform playback, 24-hour visual Status stories with viewer tracking, message replies/forwarding/pinning/starring, interactive polls, shared documents/images, and real-time voice-only audio calls (no video calls).
- **Confirmed Admin Command Center**: Dedicated admin login (`username: admin`, `password: admin783`) supporting temporary (timed) and permanent user bans, user add/edit/delete, global message moderation, system-wide broadcast banners, global read-only/maintenance lockdown mode, and enforceable media/file upload size limits.
- **Confirmed Global Theme Behavior**: The administrator selects the active global color scheme from 16 curated Material UI palettes in real time, while individual members can freely switch between Light Mode and Dark Mode within that palette.

---

### 1. Overview & Core Concept

- **What It Does**: Provides an intimate, zero-clutter real-time communication hub capped at 15 members, offering instant messaging, voice notes, ephemeral 24-hour stories, voice calling, and granular administrative oversight.
- **Target Audience / Persona**: Small, high-trust teams, private family/friend circles, or executive micro-communities that want WhatsApp's familiarity paired with centralized admin controls and custom branding.
- **Key Value**: Delivers real-time multi-user synchronization, strict 15-member exclusivity, dual authentication (Google Sign-In primary + Username/Password secondary), and instant platform-wide theming without external bloat.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Authentication & 15-Member Gate**: Users land on a Material UI sign-in screen featuring **Continue with Google** as the primary action, a secondary tab for **Username & Password** sign-in/registration (showing live `X / 15 Members Joined` capacity), and a dedicated **Admin Portal** entry (`admin` / `admin783`). Banned users see an immediate explanation screen showing their ban type (temporary countdown or permanent) and reason.
  2. **WhatsApp-Style 3-Pane Workspace**:
     - **Left Navigation Rail**: Quick switches between *Chats*, *Status (24h Stories)*, *Voice Calls*, *Starred Messages*, *Profile & Settings*, and (when logged in as Admin) *Admin Console*, plus a Light/Dark mode toggle.
     - **Middle Directory Column**: Searchable conversation list with unread counters, pinned indicators, typing/online presence, last-message read ticks, and quick filters (*All*, *Unread*, *Groups*), or the active *Status* / *Call Log* lists.
     - **Right Active Conversation Canvas**: Header with participant presence, voice call trigger, pinned message banner, and search-in-chat; scrollable message stream with date separators, quoted replies, emoji reactions, interactive polls, audio waveforms, and file/image cards; bottom composer with emoji picker, attachment menu (Image, Document, Poll), and microphone voice-note recorder.
  3. **Profile & Status Customization**: Slide-over Material UI drawer mirroring WhatsApp where members upload their profile photo, edit display name, customize their *About / Bio* status, and post 24-hour image or typography status slides with a live list of members who viewed their story.
  4. **Admin Command Center**: Dedicated multi-tab dashboard allowing the admin to inspect the 15-member roster, add/edit/delete accounts, issue temporary (1h, 24h, 7d) or permanent bans, switch the global Material UI theme across 16 palettes, broadcast pinned system announcements, delete moderated messages, toggle global read-only mode, and set maximum file upload sizes.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Crisp Material Design 3 workspace sensibility combined with WhatsApp Web's ergonomic split-pane layout—clean 1px structural dividers, subtle chat-wallpaper geometry, and tactile elevation for floating call and story overlays.
  - *Color Palette & Mood (16 Global Schemes)*:
    1. **Emerald Classic** (`#00A884` primary / `#008069` accent)
    2. **Royal Ocean** (`#0284C7` primary / `#0369A1` accent)
    3. **Midnight Indigo** (`#4F46E5` primary / `#4338CA` accent)
    4. **Sunset Coral** (`#E11D48` primary / `#BE123C` accent)
    5. **Forest Sage** (`#15803D` primary / `#166534` accent)
    6. **Amber Gold** (`#D97706` primary / `#B45309` accent)
    7. **Violet Amethyst** (`#7C3AED` primary / `#6D28D9` accent)
    8. **Slate Minimal** (`#334155` primary / `#1E293B` accent)
    9. **Crimson Ruby** (`#DC2626` primary / `#B91C1C` accent)
    10. **Teal Lagoon** (`#0D9488` primary / `#0F766E` accent)
    11. **Rose Quartz** (`#DB2777` primary / `#BE185D` accent)
    12. **Cobalt Electric** (`#2563EB` primary / `#1D4ED8` accent)
    13. **Espresso Bronze** (`#92400E` primary / `#78350F` accent)
    14. **Cyber Mint** (`#059669` primary / `#047857` accent)
    15. **Nordic Frost** (`#0369A1` primary / `#075985` accent)
    16. **Obsidian Gold** (`#B45309` primary / `#92400E` accent)
  - *Typography & Hierarchy*: `Plus Jakarta Sans` for crisp UI headers, navigation, and message legibility, paired with `JetBrains Mono` (`tabular-nums`) for message timestamps, unread counters, voice note durations, call timers, and file sizes.
  - *Component Styling & Layout*: Full-viewport `100dvh` desktop-first split workspace (collapsible on smaller viewports) built with Material UI (`ThemeProvider`, `Drawer`, `Dialog`, `Menu`, `Popover`, `Badge`, `Tooltip`, `Snackbar`, `LinearProgress`) with zero nested card clutter.
- **Interactive Feedback & Motion**:
  - Instant optimistic message bubbles with live delivery/read checkmark transitions (Single Gray → Double Gray → Double Accent Tick).
  - Smooth voice-note waveform scrubbing and live recording pulse timer.
  - Real-time snackbar and top banner transitions when the admin publishes an announcement or switches the global theme.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Hybrid Real-Time Persistence + Full-Stack Authority**
  - *Chosen Approach*: Combine Firebase Authentication (for Google Sign-In) with a persistent backend database and real-time synchronization layer so both Google accounts, secondary username/password accounts, and the hardcoded `admin` / `admin783` credentials operate seamlessly under one unified data model.
  - *Why*: Firebase Auth alone does not natively allow custom non-email username/password (`admin` / `admin783`) without email formatting or console manual toggles. A unified full-stack persistence + real-time sync architecture guarantees that Google Sign-In, custom username/password accounts, 15-member cap enforcement, file uploads, and instant admin bans work out-of-the-box with zero manual setup friction.
- **Decision 2: Voice-Only Audio Calling & Voice Notes**
  - *Chosen Approach*: Use browser `MediaRecorder` + Web Audio API for real voice note recording/waveforms, and WebRTC / real-time audio stream signaling for live 1-on-1 voice-only calls with an interactive call HUD.
  - *Why*: Delivers genuine audio recording and live voice communication while strictly honoring the exclusion of video calling.
- **Decision 3: Dynamic Material UI Theme Engine**
  - *Chosen Approach*: Store the active `themeId` (1 of 16 palettes) in global platform settings synced in real time to all connected clients, wrapped in a dynamic MUI `createTheme()` provider that merges the admin's global color palette with the user's personal `light | dark` mode preference.
  - *Why*: Changes triggered by the admin apply live across every connected browser tab within milliseconds without resetting a user's preferred dark/light comfort mode.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MUI Dynamic ThemeProvider (16 Palettes)                  │
│             Global Admin Palette  +  Per-User Light/Dark Mode               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌─────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────┐
│   Auth & Gatekeeper │   │  WhatsApp Workspace UI  │   │ Admin Command Center│
│ ─────────────────── │   │ ─────────────────────── │   │ ─────────────────── │
│ • Google Sign-In    │   │ • Left Navigation Rail  │   │ • 15-User Roster    │
│ • Username/Password │   │ • Chat & Group List     │   │ • Add/Edit/Delete   │
│ • Admin (admin783)  │   │ • Message Stream & Polls│   │ • Temp/Perm Bans    │
│ • 15-Member Cap Gate│   │ • Voice Note Recorder   │   │ • 16-Theme Switcher │
│ • Ban Status Screen │   │ • 24h Status Viewer     │   │ • Broadcasts & Lock │
└──────────┬──────────┘   │ • Voice Call Overlay    │   │ • Message Moderation│
           │              │ • Profile/Bio Drawer    │   └──────────┬──────────┘
           │              └────────────┬────────────┘              │
           └───────────────────────────┼───────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│             Real-Time Sync Engine (WebSocket + REST API + Firebase)         │
│ ─────────────────────────────────────────────────────────────────────────── │
│ • Instant Events: message:new, message:react, message:read, message:pin,    │
│   status:new, status:view, call:signal, settings:update, user:moderation    │
│ • Persistent Store: Users (<=15), Chats, Messages, Statuses, Calls, Config  │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `User`: `id`, `username`, `displayName`, `email`, `authProvider` (`google` | `password` | `admin`), `avatarUrl`, `bio`, `customStatus`, `role` (`member` | `admin`), `isOnline`, `lastSeen`, `banStatus` (`none` | `temporary` | `permanent`), `banExpiresAt`, `banReason`, `starredMessageIds`.
  - `Chat`: `id`, `type` (`direct` | `group`), `name`, `description`, `avatarUrl`, `participantIds`, `adminIds`, `pinnedMessageId`, `createdAt`, `lastMessageAt`.
  - `Message`: `id`, `chatId`, `senderId`, `type` (`text` | `image` | `file` | `voice` | `poll` | `system`), `content`, `mediaUrl`, `fileName`, `fileSize`, `voiceDuration`, `waveform`, `pollData` (`question`, `options[]` with `voterIds`), `replyToMessageId`, `forwardedFrom`, `reactions` (`{ [emoji]: userId[] }`), `deliveredTo` (`{ [userId]: timestamp }`), `readBy` (`{ [userId]: timestamp }`), `isDeleted`, `createdAt`.
  - `StatusStory`: `id`, `userId`, `type` (`image` | `text`), `content`, `mediaUrl`, `backgroundColor`, `caption`, `viewers` (`{ [userId]: timestamp }`), `createdAt`, `expiresAt` (+24h).
  - `VoiceCallLog`: `id`, `callerId`, `receiverId`, `chatId`, `status` (`ringing` | `ongoing` | `completed` | `missed` | `declined`), `startedAt`, `endedAt`, `durationSeconds`.
  - `PlatformSettings`: `activeThemeId` (1–16), `defaultColorMode` (`light` | `dark`), `maxMembers` (`15`), `maxUploadSizeMB`, `maintenanceMode` (`boolean`), `readOnlyMode` (`boolean`), `announcement` (`{ id, text, severity, active, updatedAt }`).

- **Interactive Component & State Mapping**:
  - **15-Member Registration & Login Handler**: Checks active non-admin user count before creating a new account via Google Sign-In or Username/Password; rejects new registrations when `memberCount >= 15` while allowing existing members and `admin` (`admin783`) to sign in.
  - **Ban Enforcement & Session Guard**: Evaluates `banStatus` and `banExpiresAt` on login and on every real-time event; if an admin bans a user temporarily or permanently, their active session immediately transitions to the Ban Notice screen.
  - **Message Composer & Media Guard**: Validates `readOnlyMode` and checks attached files against `PlatformSettings.maxUploadSizeMB` before uploading; converts recorded voice notes into playable audio with waveform bars.
  - **Read Receipts & Reactions Synchronizer**: Automatically marks visible messages in the active chat as `readBy[currentUserId] = now` and broadcasts updates so the sender's double ticks turn accent-colored in real time.
  - **Admin Live Theme & Broadcast Dispatcher**: Updating the theme palette, announcement banner, upload limit, or read-only toggle persists to `PlatformSettings` and broadcasts `settings:update` to re-theme and notify all connected clients immediately.
