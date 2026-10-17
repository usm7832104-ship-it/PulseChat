import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'pulsechat-db.json');

function createSvgAvatar(initials: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="60" fill="${bg}"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Plus Jakarta Sans, sans-serif" font-weight="700" font-size="42">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Generate a synthetic playable WAV data URI for seeded voice notes so playback works immediately
function createSeededVoiceNoteWav(durationSec = 4): string {
  const sampleRate = 8000;
  const numSamples = sampleRate * durationSec;
  const buffer = Buffer.alloc(44 + numSamples);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin(Math.PI * (t / durationSec)) * 0.35;
    const freq = 220 + 60 * Math.sin(2 * Math.PI * 1.5 * t);
    const val = Math.floor(128 + 127 * envelope * Math.sin(2 * Math.PI * freq * t));
    buffer.writeUInt8(Math.max(0, Math.min(255, val)), 44 + i);
  }

  return `data:audio/wav;base64,${buffer.toString('base64')}`;
}

interface StoredUser {
  id: string;
  username: string;
  password?: string;
  displayName: string;
  email?: string;
  authProvider: 'google' | 'password' | 'admin';
  avatarUrl: string;
  bio: string;
  customStatus: string;
  phone?: string;
  role: 'member' | 'admin';
  isOnline: boolean;
  lastSeen: string;
  banStatus: 'none' | 'temporary' | 'permanent';
  banExpiresAt?: string | null;
  banReason?: string;
  starredMessageIds: string[];
  createdAt: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  chats: any[];
  messages: any[];
  statuses: any[];
  calls: any[];
  settings: {
    activeThemeId: string;
    defaultColorMode: 'light' | 'dark';
    maxMembers: number;
    maxUploadSizeMB: number;
    maintenanceMode: boolean;
    readOnlyMode: boolean;
    announcement: {
      id: string;
      text: string;
      severity: 'info' | 'warning' | 'error' | 'success';
      active: boolean;
      updatedAt: string;
      authorName: string;
    } | null;
  };
}

function getInitialDatabase(): DatabaseSchema {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600 * 1000).toISOString();
  const thirtyMinAgo = new Date(now.getTime() - 1800 * 1000).toISOString();
  const tenMinAgo = new Date(now.getTime() - 600 * 1000).toISOString();
  const fiveMinAgo = new Date(now.getTime() - 300 * 1000).toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

  const users: StoredUser[] = [
    {
      id: 'user-admin',
      username: 'admin',
      password: 'admin783',
      displayName: 'Platform Admin',
      email: 'usm.7832104@gmail.com',
      authProvider: 'admin',
      avatarUrl: createSvgAvatar('AD', '#0f172a'),
      bio: 'PulseChat 15 Administrator & Community Guardian',
      customStatus: 'Managing Workspace',
      phone: '+1 (555) 010-0001',
      role: 'admin',
      isOnline: true,
      lastSeen: now.toISOString(),
      banStatus: 'none',
      banExpiresAt: null,
      banReason: '',
      starredMessageIds: ['msg-welcome-1'],
      createdAt: oneHourAgo,
    },
    {
      id: 'user-elena',
      username: 'elena',
      password: 'password123',
      displayName: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      authProvider: 'password',
      avatarUrl: createSvgAvatar('ER', '#00a884'),
      bio: 'Product Architect · Building sleek interfaces',
      customStatus: 'Available',
      phone: '+1 (555) 019-2831',
      role: 'member',
      isOnline: true,
      lastSeen: now.toISOString(),
      banStatus: 'none',
      banExpiresAt: null,
      banReason: '',
      starredMessageIds: [],
      createdAt: oneHourAgo,
    },
    {
      id: 'user-marcus',
      username: 'marcus',
      password: 'password123',
      displayName: 'Marcus Vance',
      email: 'marcus.vance@example.com',
      authProvider: 'password',
      avatarUrl: createSvgAvatar('MV', '#0284c7'),
      bio: 'Design Systems & Material UI Enthusiast',
      customStatus: 'In a design sprint',
      phone: '+1 (555) 019-4492',
      role: 'member',
      isOnline: true,
      lastSeen: now.toISOString(),
      banStatus: 'none',
      banExpiresAt: null,
      banReason: '',
      starredMessageIds: [],
      createdAt: oneHourAgo,
    },
    {
      id: 'user-aria',
      username: 'aria',
      password: 'password123',
      displayName: 'Aria Chen',
      email: 'aria.chen@example.com',
      authProvider: 'password',
      avatarUrl: createSvgAvatar('AC', '#7c3aed'),
      bio: 'Audio DSP & Real-Time Communications Lead',
      customStatus: 'Recording voice notes',
      phone: '+1 (555) 019-8820',
      role: 'member',
      isOnline: false,
      lastSeen: thirtyMinAgo,
      banStatus: 'none',
      banExpiresAt: null,
      banReason: '',
      starredMessageIds: [],
      createdAt: oneHourAgo,
    },
    {
      id: 'user-liam',
      username: 'liam',
      password: 'password123',
      displayName: "Liam O'Connor",
      email: 'liam.oconnor@example.com',
      authProvider: 'password',
      avatarUrl: createSvgAvatar('LO', '#d97706'),
      bio: 'Zero-trust infrastructure & privacy advocate',
      customStatus: 'At work',
      phone: '+1 (555) 019-7734',
      role: 'member',
      isOnline: false,
      lastSeen: tenMinAgo,
      banStatus: 'none',
      banExpiresAt: null,
      banReason: '',
      starredMessageIds: [],
      createdAt: oneHourAgo,
    },
  ];

  const chats = [
    {
      id: 'chat-lounge',
      type: 'group',
      name: 'PulseChat 15 Lounge',
      description: 'Official private circle for all 15 community members. Announcements, polls, voice notes, and daily updates.',
      avatarUrl: createSvgAvatar('P15', '#008069'),
      participantIds: ['user-admin', 'user-elena', 'user-marcus', 'user-aria', 'user-liam'],
      adminIds: ['user-admin', 'user-elena'],
      pinnedMessageId: 'msg-welcome-1',
      createdAt: oneHourAgo,
      lastMessageAt: fiveMinAgo,
      typingUserIds: [],
    },
    {
      id: 'chat-design-guild',
      type: 'group',
      name: 'Material UI & Theme Studio',
      description: 'Discussing our 16 global color palettes, dark mode posture, and UI polish.',
      avatarUrl: createSvgAvatar('MU', '#4f46e5'),
      participantIds: ['user-admin', 'user-elena', 'user-marcus', 'user-aria'],
      adminIds: ['user-admin', 'user-marcus'],
      pinnedMessageId: null,
      createdAt: oneHourAgo,
      lastMessageAt: tenMinAgo,
      typingUserIds: [],
    },
    {
      id: 'chat-dm-elena-admin',
      type: 'direct',
      name: 'Elena Rostova',
      description: 'Direct 1-on-1 encrypted chat',
      avatarUrl: '',
      participantIds: ['user-admin', 'user-elena'],
      adminIds: [],
      pinnedMessageId: null,
      createdAt: oneHourAgo,
      lastMessageAt: tenMinAgo,
      typingUserIds: [],
    },
  ];

  const messages = [
    {
      id: 'msg-welcome-1',
      chatId: 'chat-lounge',
      senderId: 'user-admin',
      type: 'text',
      content: 'Welcome to PulseChat 15! This private workspace is strictly capped at 15 members. Enjoy real-time messaging, voice notes, 24h status updates, polls, and voice calling.',
      reactions: { '👍': ['user-elena', 'user-marcus'], '❤️': ['user-aria'] },
      deliveredTo: {
        'user-elena': thirtyMinAgo,
        'user-marcus': thirtyMinAgo,
        'user-aria': thirtyMinAgo,
        'user-liam': thirtyMinAgo,
      },
      readBy: {
        'user-elena': tenMinAgo,
        'user-marcus': tenMinAgo,
        'user-aria': tenMinAgo,
      },
      replyToMessageId: null,
      forwardedFromName: null,
      createdAt: thirtyMinAgo,
    },
    {
      id: 'msg-lounge-2',
      chatId: 'chat-lounge',
      senderId: 'user-elena',
      type: 'text',
      content: 'The Material UI layout feels super clean! I also love that read receipts and emoji reactions update live across tabs.',
      reactions: { '🔥': ['user-admin', 'user-marcus'] },
      deliveredTo: {
        'user-admin': tenMinAgo,
        'user-marcus': tenMinAgo,
        'user-aria': tenMinAgo,
        'user-liam': tenMinAgo,
      },
      readBy: {
        'user-admin': fiveMinAgo,
        'user-marcus': fiveMinAgo,
      },
      replyToMessageId: 'msg-welcome-1',
      forwardedFromName: null,
      createdAt: tenMinAgo,
    },
    {
      id: 'msg-lounge-voice',
      chatId: 'chat-lounge',
      senderId: 'user-aria',
      type: 'voice',
      content: 'Voice note (0:04)',
      mediaUrl: createSeededVoiceNoteWav(4),
      voiceDuration: 4,
      waveform: [22, 48, 76, 92, 60, 84, 52, 35, 78, 95, 66, 40, 72, 88, 54, 30, 62, 80, 45, 25],
      reactions: { '🎧': ['user-elena'] },
      deliveredTo: {
        'user-admin': tenMinAgo,
        'user-elena': tenMinAgo,
        'user-marcus': tenMinAgo,
      },
      readBy: {
        'user-admin': fiveMinAgo,
        'user-elena': fiveMinAgo,
      },
      replyToMessageId: null,
      forwardedFromName: null,
      createdAt: new Date(now.getTime() - 480 * 1000).toISOString(),
    },
    {
      id: 'msg-lounge-poll',
      chatId: 'chat-lounge',
      senderId: 'user-marcus',
      type: 'poll',
      content: 'Which global color palette should we set for Friday?',
      pollData: {
        question: 'Which global color palette should we set for Friday?',
        allowMultiple: false,
        options: [
          { id: 'opt-1', text: 'Emerald Classic (#00A884)', voterIds: ['user-elena', 'user-admin'] },
          { id: 'opt-2', text: 'Midnight Indigo (#4F46E5)', voterIds: ['user-marcus'] },
          { id: 'opt-3', text: 'Royal Ocean (#0284C7)', voterIds: ['user-aria'] },
          { id: 'opt-4', text: 'Sunset Coral (#E11D48)', voterIds: [] },
        ],
      },
      reactions: { '📊': ['user-admin'] },
      deliveredTo: {
        'user-admin': fiveMinAgo,
        'user-elena': fiveMinAgo,
        'user-aria': fiveMinAgo,
      },
      readBy: {
        'user-admin': fiveMinAgo,
        'user-elena': fiveMinAgo,
      },
      replyToMessageId: null,
      forwardedFromName: null,
      createdAt: fiveMinAgo,
    },
    {
      id: 'msg-design-1',
      chatId: 'chat-design-guild',
      senderId: 'user-marcus',
      type: 'text',
      content: 'We have all 16 global color schemes configured in the Admin Command Center. Any admin change re-themes the entire workspace in real time!',
      reactions: { '✨': ['user-elena', 'user-admin'] },
      deliveredTo: { 'user-admin': tenMinAgo, 'user-elena': tenMinAgo },
      readBy: { 'user-admin': fiveMinAgo, 'user-elena': fiveMinAgo },
      replyToMessageId: null,
      forwardedFromName: null,
      createdAt: tenMinAgo,
    },
    {
      id: 'msg-dm-1',
      chatId: 'chat-dm-elena-admin',
      senderId: 'user-elena',
      type: 'text',
      content: 'Hi Admin! All 4 initial team members are onboarded. We still have 11 member slots open out of our 15-member cap.',
      reactions: { '👍': ['user-admin'] },
      deliveredTo: { 'user-admin': tenMinAgo },
      readBy: { 'user-admin': fiveMinAgo },
      replyToMessageId: null,
      forwardedFromName: null,
      createdAt: tenMinAgo,
    },
  ];

  const statuses = [
    {
      id: 'status-elena-1',
      userId: 'user-elena',
      type: 'text',
      content: 'Shipping PulseChat 15 today — Material UI + instant read receipts + 16 live themes!',
      backgroundColor: '#008069',
      textColor: '#ffffff',
      caption: 'Launch Day Milestone',
      viewers: { 'user-marcus': tenMinAgo, 'user-admin': fiveMinAgo },
      createdAt: thirtyMinAgo,
      expiresAt: tomorrow,
    },
    {
      id: 'status-marcus-1',
      userId: 'user-marcus',
      type: 'text',
      content: 'Testing out the 16 global color schemes. Midnight Indigo and Royal Ocean look sharp in Dark Mode.',
      backgroundColor: '#312e81',
      textColor: '#ffffff',
      caption: 'Theme Studio Preview',
      viewers: { 'user-elena': fiveMinAgo },
      createdAt: tenMinAgo,
      expiresAt: tomorrow,
    },
  ];

  const calls = [
    {
      id: 'call-seed-1',
      callerId: 'user-elena',
      receiverId: 'user-admin',
      chatId: 'chat-dm-elena-admin',
      status: 'completed',
      startedAt: thirtyMinAgo,
      endedAt: new Date(now.getTime() - 1615 * 1000).toISOString(),
      durationSeconds: 185,
    },
    {
      id: 'call-seed-2',
      callerId: 'user-marcus',
      receiverId: 'user-elena',
      chatId: 'chat-design-guild',
      status: 'completed',
      startedAt: tenMinAgo,
      endedAt: new Date(now.getTime() - 510 * 1000).toISOString(),
      durationSeconds: 90,
    },
  ];

  return {
    users,
    chats,
    messages,
    statuses,
    calls,
    settings: {
      activeThemeId: 'whatsapp-emerald',
      defaultColorMode: 'light',
      maxMembers: 15,
      maxUploadSizeMB: 5,
      maintenanceMode: false,
      readOnlyMode: false,
      announcement: {
        id: 'ann-initial',
        text: 'Welcome to PulseChat 15! Exclusive 15-member community workspace. Use the Admin Console to switch between 16+ global color schemes.',
        severity: 'info',
        active: true,
        updatedAt: thirtyMinAgo,
        authorName: 'Platform Admin',
      },
    },
  };
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db: DatabaseSchema;
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    db = JSON.parse(raw);
  } else {
    db = getInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  }
} catch (err) {
  console.error('Error loading DB, initializing fresh state:', err);
  db = getInitialDatabase();
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}

function sanitizeUser(u: StoredUser) {
  const { password, ...rest } = u;
  return rest;
}

// Automatically lift expired temporary bans and prune expired 24h status stories
function runMaintenanceChecks(): boolean {
  let changed = false;
  const now = Date.now();

  for (const user of db.users) {
    if (
      user.banStatus === 'temporary' &&
      user.banExpiresAt &&
      new Date(user.banExpiresAt).getTime() <= now
    ) {
      user.banStatus = 'none';
      user.banExpiresAt = null;
      user.banReason = '';
      changed = true;
    }
  }

  const validStatuses = db.statuses.filter(
    (s) => new Date(s.expiresAt).getTime() > now
  );
  if (validStatuses.length !== db.statuses.length) {
    db.statuses = validStatuses;
    changed = true;
  }

  if (changed) saveDb();
  return changed;
}

function getNonAdminMemberCount(): number {
  return db.users.filter((u) => u.role !== 'admin').length;
}

function ensureUserInDefaultChats(userId: string) {
  const lounge = db.chats.find((c) => c.id === 'chat-lounge');
  if (lounge && !lounge.participantIds.includes(userId)) {
    lounge.participantIds.push(userId);
  }
  // Ensure user has a direct 1-on-1 chat with Elena or Admin so they can test 1-on-1 immediately
  const targetPartnerId = userId === 'user-admin' ? 'user-elena' : 'user-admin';
  const existingDm = db.chats.find(
    (c) =>
      c.type === 'direct' &&
      c.participantIds.includes(userId) &&
      c.participantIds.includes(targetPartnerId)
  );
  if (!existingDm && userId !== targetPartnerId) {
    const partner = db.users.find((u) => u.id === targetPartnerId);
    db.chats.push({
      id: `chat-dm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'direct',
      name: partner?.displayName || 'Direct Chat',
      description: 'Direct 1-on-1 encrypted chat',
      avatarUrl: '',
      participantIds: [userId, targetPartnerId],
      adminIds: [],
      pinnedMessageId: null,
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      typingUserIds: [],
    });
  }
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // Raise JSON payload limit to 25MB so image, document, and voice note uploads work smoothly
  app.use(express.json({ limit: '25mb' }));

  const clients = new Map<WebSocket, { userId: string | null }>();

  function broadcast(type: string, payload: any) {
    const message = JSON.stringify({ type, payload });
    for (const [ws] of clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  function broadcastFullState() {
    runMaintenanceChecks();
    broadcast('state:sync', {
      users: db.users.map(sanitizeUser),
      chats: db.chats,
      messages: db.messages,
      statuses: db.statuses,
      calls: db.calls,
      settings: db.settings,
    });
  }

  // Periodically check temporary ban expirations & 24h status expirations
  setInterval(() => {
    if (runMaintenanceChecks()) {
      broadcastFullState();
    }
  }, 15000);

  // --- REST API ROUTES ---

  // 1. Bootstrap State
  app.get('/api/bootstrap', (_req, res) => {
    runMaintenanceChecks();
    res.json({
      users: db.users.map(sanitizeUser),
      chats: db.chats,
      messages: db.messages,
      statuses: db.statuses,
      calls: db.calls,
      settings: db.settings,
      memberCount: getNonAdminMemberCount(),
    });
  });

  // 2. Dedicated Admin Login (admin / admin783)
  app.post('/api/auth/admin', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin783') {
      let adminUser = db.users.find((u) => u.username === 'admin' || u.role === 'admin');
      if (!adminUser) {
        adminUser = getInitialDatabase().users[0];
        db.users.unshift(adminUser);
      }
      adminUser.isOnline = true;
      adminUser.lastSeen = new Date().toISOString();
      ensureUserInDefaultChats(adminUser.id);
      saveDb();
      broadcastFullState();
      return res.json({ user: sanitizeUser(adminUser) });
    }
    return res.status(401).json({
      error: 'Invalid admin credentials. Please verify your admin username and password.',
    });
  });

  // 3. Google Sign-In Synchronization & 15-Member Cap Check
  app.post('/api/auth/google', (req, res) => {
    runMaintenanceChecks();
    const { uid, email, displayName, photoURL } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'Missing Google user UID.' });
    }

    const normalizedEmail = (email || '').toLowerCase().trim();
    const isBootstrappedAdmin = normalizedEmail === 'usm.7832104@gmail.com';

    let user = db.users.find(
      (u) =>
        u.id === `google-${uid}` ||
        (normalizedEmail && u.email?.toLowerCase() === normalizedEmail && u.authProvider === 'google')
    );

    if (!user) {
      // Check 15-member cap for non-admin registrations
      const currentMembers = getNonAdminMemberCount();
      if (!isBootstrappedAdmin && currentMembers >= db.settings.maxMembers) {
        return res.status(403).json({
          error: `Membership limit reached (${db.settings.maxMembers}/${db.settings.maxMembers} members). Only existing members or administrators can sign in.`,
        });
      }

      const cleanName = (displayName || normalizedEmail.split('@')[0] || 'Member').slice(0, 60);
      const initials = cleanName
        .split(' ')
        .map((p: string) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      user = {
        id: `google-${uid}`,
        username: normalizedEmail ? normalizedEmail.split('@')[0] : `user_${uid.slice(0, 6)}`,
        displayName: cleanName,
        email: normalizedEmail,
        authProvider: 'google',
        avatarUrl: photoURL || createSvgAvatar(initials || 'MB', '#00a884'),
        bio: 'Hey there! I am using PulseChat 15.',
        customStatus: 'Available',
        phone: '',
        role: isBootstrappedAdmin ? 'admin' : 'member',
        isOnline: true,
        lastSeen: new Date().toISOString(),
        banStatus: 'none',
        banExpiresAt: null,
        banReason: '',
        starredMessageIds: [],
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);

      // Post system welcome message in Lounge
      db.messages.push({
        id: `msg-sys-${Date.now()}`,
        chatId: 'chat-lounge',
        senderId: user.id,
        type: 'system',
        content: `${user.displayName} joined PulseChat 15 via Google Sign-In (${getNonAdminMemberCount()}/${db.settings.maxMembers} members).`,
        reactions: {},
        deliveredTo: {},
        readBy: {},
        createdAt: new Date().toISOString(),
      });
    } else {
      user.isOnline = true;
      user.lastSeen = new Date().toISOString();
      if (isBootstrappedAdmin) {
        user.role = 'admin';
      }
    }

    ensureUserInDefaultChats(user.id);
    saveDb();
    broadcastFullState();
    return res.json({ user: sanitizeUser(user) });
  });

  // 4. Secondary Auth: Username & Password Login or Registration
  app.post('/api/auth/password', (req, res) => {
    runMaintenanceChecks();
    const { mode, username, password, displayName, bio } = req.body;
    const cleanUsername = (username || '').trim().toLowerCase();

    if (!cleanUsername || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Also allow admin / admin783 through username/password form seamlessly
    if (cleanUsername === 'admin' && password === 'admin783') {
      let adminUser = db.users.find((u) => u.username === 'admin');
      if (adminUser) {
        adminUser.isOnline = true;
        adminUser.lastSeen = new Date().toISOString();
        ensureUserInDefaultChats(adminUser.id);
        saveDb();
        broadcastFullState();
        return res.json({ user: sanitizeUser(adminUser) });
      }
    }

    if (mode === 'register') {
      const existing = db.users.find((u) => u.username.toLowerCase() === cleanUsername);
      if (existing) {
        return res.status(409).json({ error: 'That username is already taken. Try signing in instead.' });
      }

      const currentMembers = getNonAdminMemberCount();
      if (currentMembers >= db.settings.maxMembers) {
        return res.status(403).json({
          error: `Community capacity reached (${db.settings.maxMembers}/${db.settings.maxMembers} members max). New registrations are closed.`,
        });
      }

      const finalDisplayName = (displayName || cleanUsername).trim().slice(0, 60);
      const initials = finalDisplayName
        .split(' ')
        .map((p: string) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      const colors = ['#00a884', '#0284c7', '#4f46e5', '#e11d48', '#15803d', '#d97706', '#7c3aed'];
      const pickedColor = colors[db.users.length % colors.length];

      const newUser: StoredUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        username: cleanUsername,
        password: String(password),
        displayName: finalDisplayName,
        email: `${cleanUsername}@pulsechat.local`,
        authProvider: 'password',
        avatarUrl: createSvgAvatar(initials || 'U', pickedColor),
        bio: (bio || 'Hey there! I am using PulseChat 15.').slice(0, 160),
        customStatus: 'Available',
        phone: '',
        role: 'member',
        isOnline: true,
        lastSeen: new Date().toISOString(),
        banStatus: 'none',
        banExpiresAt: null,
        banReason: '',
        starredMessageIds: [],
        createdAt: new Date().toISOString(),
      };

      db.users.push(newUser);
      ensureUserInDefaultChats(newUser.id);

      db.messages.push({
        id: `msg-sys-${Date.now()}`,
        chatId: 'chat-lounge',
        senderId: newUser.id,
        type: 'system',
        content: `${newUser.displayName} (@${newUser.username}) joined the community (${getNonAdminMemberCount()}/${db.settings.maxMembers} members).`,
        reactions: {},
        deliveredTo: {},
        readBy: {},
        createdAt: new Date().toISOString(),
      });

      saveDb();
      broadcastFullState();
      return res.json({ user: sanitizeUser(newUser) });
    } else {
      // Login mode
      const existing = db.users.find((u) => u.username.toLowerCase() === cleanUsername);
      if (!existing || existing.password !== String(password)) {
        return res.status(401).json({
          error: 'Invalid username or password. You can also use a demo member (e.g. elena / password123).',
        });
      }
      existing.isOnline = true;
      existing.lastSeen = new Date().toISOString();
      ensureUserInDefaultChats(existing.id);
      saveDb();
      broadcastFullState();
      return res.json({ user: sanitizeUser(existing) });
    }
  });

  // 5. Logout
  app.post('/api/auth/logout', (req, res) => {
    const { userId } = req.body;
    const user = db.users.find((u) => u.id === userId);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date().toISOString();
      saveDb();
      broadcastFullState();
    }
    res.json({ ok: true });
  });

  // 6. Update User Profile (Avatar, Display Name, Bio, Custom Status, Phone)
  app.put('/api/users/:id/profile', (req, res) => {
    const { id } = req.params;
    const { displayName, bio, customStatus, avatarUrl, phone } = req.body;
    const user = db.users.find((u) => u.id === id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (typeof displayName === 'string' && displayName.trim()) {
      user.displayName = displayName.trim().slice(0, 60);
    }
    if (typeof bio === 'string') {
      user.bio = bio.slice(0, 200);
    }
    if (typeof customStatus === 'string') {
      user.customStatus = customStatus.slice(0, 60);
    }
    if (typeof avatarUrl === 'string' && avatarUrl.trim()) {
      user.avatarUrl = avatarUrl;
    }
    if (typeof phone === 'string') {
      user.phone = phone.slice(0, 30);
    }

    saveDb();
    broadcastFullState();
    return res.json({ user: sanitizeUser(user) });
  });

  // 7. Create Direct 1-on-1 Chat or Custom Group Chat
  app.post('/api/chats', (req, res) => {
    const { type, name, description, avatarUrl, participantIds, creatorId } = req.body;
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ error: 'Participants required.' });
    }

    if (type === 'direct' && participantIds.length === 2) {
      const existing = db.chats.find(
        (c) =>
          c.type === 'direct' &&
          c.participantIds.length === 2 &&
          c.participantIds.includes(participantIds[0]) &&
          c.participantIds.includes(participantIds[1])
      );
      if (existing) {
        return res.json({ chat: existing });
      }
    }

    const cleanName = (name || 'New Group').trim().slice(0, 60);
    const initials = cleanName
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const newChat = {
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: type === 'group' ? 'group' : 'direct',
      name: cleanName,
      description: (description || '').slice(0, 200),
      avatarUrl:
        avatarUrl ||
        (type === 'group' ? createSvgAvatar(initials || 'GR', '#0284c7') : ''),
      participantIds: Array.from(new Set(participantIds)),
      adminIds: creatorId ? [creatorId] : [participantIds[0]],
      pinnedMessageId: null,
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      typingUserIds: [],
    };

    db.chats.unshift(newChat);

    if (newChat.type === 'group') {
      const creator = db.users.find((u) => u.id === creatorId);
      db.messages.push({
        id: `msg-sys-${Date.now()}`,
        chatId: newChat.id,
        senderId: creatorId || participantIds[0],
        type: 'system',
        content: `${creator?.displayName || 'A member'} created group "${newChat.name}"`,
        reactions: {},
        deliveredTo: {},
        readBy: {},
        createdAt: new Date().toISOString(),
      });
    }

    saveDb();
    broadcastFullState();
    return res.json({ chat: newChat });
  });

  // 8. Send Message (Text, Image, File/Document, Voice Note, Poll)
  app.post('/api/messages', (req, res) => {
    runMaintenanceChecks();
    const {
      chatId,
      senderId,
      type,
      content,
      mediaUrl,
      fileName,
      fileSize,
      mimeType,
      voiceDuration,
      waveform,
      pollData,
      replyToMessageId,
      forwardedFromName,
    } = req.body;

    const sender = db.users.find((u) => u.id === senderId);
    if (!sender) {
      return res.status(404).json({ error: 'Sender not found.' });
    }
    if (sender.banStatus !== 'none') {
      return res.status(403).json({ error: 'Your account is currently restricted from sending messages.' });
    }

    if ((db.settings.maintenanceMode || db.settings.readOnlyMode) && sender.role !== 'admin') {
      return res.status(403).json({
        error: 'Workspace is currently in Admin Read-Only / Maintenance Mode. Only administrators can post messages.',
      });
    }

    // Check file size limit enforced by Admin
    if ((type === 'image' || type === 'file') && typeof fileSize === 'number') {
      const maxBytes = db.settings.maxUploadSizeMB * 1024 * 1024;
      if (fileSize > maxBytes) {
        return res.status(413).json({
          error: `File exceeds the maximum upload limit of ${db.settings.maxUploadSizeMB} MB set by the administrator.`,
        });
      }
    }

    const chat = db.chats.find((c) => c.id === chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    const nowIso = new Date().toISOString();
    const deliveredTo: Record<string, string> = {};
    const readBy: Record<string, string> = { [senderId]: nowIso };

    // Mark delivered immediately to all currently online participants
    for (const pid of chat.participantIds) {
      if (pid !== senderId) {
        const pUser = db.users.find((u) => u.id === pid);
        if (pUser?.isOnline) {
          deliveredTo[pid] = nowIso;
        }
      }
    }

    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      chatId,
      senderId,
      type: type || 'text',
      content: (content || '').slice(0, 4000),
      mediaUrl: mediaUrl || undefined,
      fileName: fileName || undefined,
      fileSize: fileSize || undefined,
      mimeType: mimeType || undefined,
      voiceDuration: voiceDuration || undefined,
      waveform: waveform || undefined,
      pollData: pollData || undefined,
      replyToMessageId: replyToMessageId || null,
      forwardedFromName: forwardedFromName || null,
      reactions: {},
      deliveredTo,
      readBy,
      isDeleted: false,
      deletedByAdmin: false,
      createdAt: nowIso,
    };

    db.messages.push(newMessage);
    chat.lastMessageAt = nowIso;

    saveDb();
    broadcastFullState();
    return res.json({ message: newMessage });
  });

  // 9. Toggle Emoji Reaction on Message
  app.post('/api/messages/:id/react', (req, res) => {
    const { id } = req.params;
    const { userId, emoji } = req.body;
    const msg = db.messages.find((m) => m.id === id);
    if (!msg) return res.status(404).json({ error: 'Message not found.' });

    if (!msg.reactions) msg.reactions = {};
    const currentList: string[] = msg.reactions[emoji] || [];
    if (currentList.includes(userId)) {
      msg.reactions[emoji] = currentList.filter((u) => u !== userId);
      if (msg.reactions[emoji].length === 0) {
        delete msg.reactions[emoji];
      }
    } else {
      msg.reactions[emoji] = [...currentList, userId];
    }

    saveDb();
    broadcastFullState();
    return res.json({ message: msg });
  });

  // 10. Vote on Poll Message
  app.post('/api/messages/:id/poll-vote', (req, res) => {
    const { id } = req.params;
    const { userId, optionId } = req.body;
    const msg = db.messages.find((m) => m.id === id);
    if (!msg || !msg.pollData) {
      return res.status(404).json({ error: 'Poll not found.' });
    }

    for (const opt of msg.pollData.options) {
      if (opt.id === optionId) {
        if (opt.voterIds.includes(userId)) {
          opt.voterIds = opt.voterIds.filter((v: string) => v !== userId);
        } else {
          opt.voterIds.push(userId);
        }
      } else if (!msg.pollData.allowMultiple) {
        opt.voterIds = opt.voterIds.filter((v: string) => v !== userId);
      }
    }

    saveDb();
    broadcastFullState();
    return res.json({ message: msg });
  });

  // 11. Mark Chat Messages as Read (Read Receipts)
  app.post('/api/chats/:id/read', (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const nowIso = new Date().toISOString();
    let updated = false;

    for (const msg of db.messages) {
      if (msg.chatId === id && msg.senderId !== userId) {
        if (!msg.deliveredTo) msg.deliveredTo = {};
        if (!msg.readBy) msg.readBy = {};
        if (!msg.deliveredTo[userId]) {
          msg.deliveredTo[userId] = nowIso;
          updated = true;
        }
        if (!msg.readBy[userId]) {
          msg.readBy[userId] = nowIso;
          updated = true;
        }
      }
    }

    if (updated) {
      saveDb();
      broadcastFullState();
    }
    return res.json({ ok: true });
  });

  // 12. Pin / Unpin Message in Chat
  app.post('/api/chats/:id/pin', (req, res) => {
    const { id } = req.params;
    const { messageId } = req.body;
    const chat = db.chats.find((c) => c.id === id);
    if (!chat) return res.status(404).json({ error: 'Chat not found.' });

    chat.pinnedMessageId = chat.pinnedMessageId === messageId ? null : messageId;
    saveDb();
    broadcastFullState();
    return res.json({ chat });
  });

  // 13. Star / Unstar Message for User
  app.post('/api/users/:id/star', (req, res) => {
    const { id } = req.params;
    const { messageId } = req.body;
    const user = db.users.find((u) => u.id === id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (user.starredMessageIds.includes(messageId)) {
      user.starredMessageIds = user.starredMessageIds.filter((m) => m !== messageId);
    } else {
      user.starredMessageIds.push(messageId);
    }

    saveDb();
    broadcastFullState();
    return res.json({ user: sanitizeUser(user) });
  });

  // 14. Delete Message (Sender or Admin Moderation)
  app.delete('/api/messages/:id', (req, res) => {
    const { id } = req.params;
    const { requesterId } = req.body;
    const msg = db.messages.find((m) => m.id === id);
    if (!msg) return res.status(404).json({ error: 'Message not found.' });

    const requester = db.users.find((u) => u.id === requesterId);
    const isAdmin = requester?.role === 'admin';
    if (msg.senderId !== requesterId && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this message.' });
    }

    msg.isDeleted = true;
    msg.deletedByAdmin = isAdmin && msg.senderId !== requesterId;
    msg.content = msg.deletedByAdmin
      ? 'This message was removed by the Platform Administrator.'
      : 'This message was deleted.';
    msg.mediaUrl = undefined;
    msg.pollData = undefined;

    saveDb();
    broadcastFullState();
    return res.json({ message: msg });
  });

  // 15. Post 24-Hour Status Story
  app.post('/api/statuses', (req, res) => {
    const { userId, type, content, mediaUrl, backgroundColor, textColor, caption } = req.body;
    const user = db.users.find((u) => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.banStatus !== 'none') {
      return res.status(403).json({ error: 'Banned users cannot post status updates.' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

    const newStatus = {
      id: `status-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      type: type === 'image' ? 'image' : 'text',
      content: (content || '').slice(0, 500),
      mediaUrl: mediaUrl || undefined,
      backgroundColor: backgroundColor || '#008069',
      textColor: textColor || '#ffffff',
      caption: (caption || '').slice(0, 200),
      viewers: {},
      createdAt: now.toISOString(),
      expiresAt,
    };

    db.statuses.unshift(newStatus);
    saveDb();
    broadcastFullState();
    return res.json({ status: newStatus });
  });

  // 16. Record Status View
  app.post('/api/statuses/:id/view', (req, res) => {
    const { id } = req.params;
    const { viewerId } = req.body;
    const status = db.statuses.find((s) => s.id === id);
    if (!status) return res.status(404).json({ error: 'Status not found.' });

    if (viewerId && viewerId !== status.userId) {
      if (!status.viewers) status.viewers = {};
      status.viewers[viewerId] = new Date().toISOString();
      saveDb();
      broadcastFullState();
    }
    return res.json({ status });
  });

  // 17. Delete Status Story
  app.delete('/api/statuses/:id', (req, res) => {
    const { id } = req.params;
    db.statuses = db.statuses.filter((s) => s.id !== id);
    saveDb();
    broadcastFullState();
    return res.json({ ok: true });
  });

  // 18. Log / Update Voice-Only Call
  app.post('/api/calls', (req, res) => {
    const { callerId, receiverId, chatId, status, durationSeconds } = req.body;
    const newCall = {
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      callerId,
      receiverId,
      chatId: chatId || undefined,
      status: status || 'completed',
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: typeof durationSeconds === 'number' ? durationSeconds : 0,
    };
    db.calls.unshift(newCall);
    saveDb();
    broadcastFullState();
    return res.json({ call: newCall });
  });

  // --- ADMIN COMMAND CENTER ROUTES ---

  // 19. Admin: Add New User
  app.post('/api/admin/users', (req, res) => {
    const { username, password, displayName, bio, role } = req.body;
    const cleanUsername = (username || '').trim().toLowerCase();
    if (!cleanUsername || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    if (db.users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return res.status(409).json({ error: 'Username already exists.' });
    }

    const targetRole = role === 'admin' ? 'admin' : 'member';
    if (targetRole === 'member' && getNonAdminMemberCount() >= db.settings.maxMembers) {
      return res.status(403).json({
        error: `Cannot add member: 15-member cap (${db.settings.maxMembers}/${db.settings.maxMembers}) is already full.`,
      });
    }

    const cleanName = (displayName || cleanUsername).trim().slice(0, 60);
    const initials = cleanName
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const newUser: StoredUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: cleanUsername,
      password: String(password),
      displayName: cleanName,
      email: `${cleanUsername}@pulsechat.local`,
      authProvider: 'password',
      avatarUrl: createSvgAvatar(initials || 'MB', '#0284c7'),
      bio: (bio || 'Member added by Administrator').slice(0, 200),
      customStatus: 'Available',
      phone: '',
      role: targetRole,
      isOnline: false,
      lastSeen: new Date().toISOString(),
      banStatus: 'none',
      banExpiresAt: null,
      banReason: '',
      starredMessageIds: [],
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    ensureUserInDefaultChats(newUser.id);
    saveDb();
    broadcastFullState();
    return res.json({ user: sanitizeUser(newUser) });
  });

  // 20. Admin: Edit User (Name, Username, Password, Bio, Role)
  app.put('/api/admin/users/:id', (req, res) => {
    const { id } = req.params;
    const { displayName, username, password, bio, customStatus, role } = req.body;
    const user = db.users.find((u) => u.id === id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (typeof displayName === 'string' && displayName.trim()) {
      user.displayName = displayName.trim().slice(0, 60);
    }
    if (typeof username === 'string' && username.trim()) {
      const cleanU = username.trim().toLowerCase();
      const conflict = db.users.find((u) => u.id !== id && u.username.toLowerCase() === cleanU);
      if (conflict) {
        return res.status(409).json({ error: 'Username already taken by another user.' });
      }
      user.username = cleanU;
    }
    if (typeof password === 'string' && password.trim()) {
      user.password = password.trim();
    }
    if (typeof bio === 'string') {
      user.bio = bio.slice(0, 200);
    }
    if (typeof customStatus === 'string') {
      user.customStatus = customStatus.slice(0, 60);
    }
    if (role === 'admin' || role === 'member') {
      user.role = role;
    }

    saveDb();
    broadcastFullState();
    return res.json({ user: sanitizeUser(user) });
  });

  // 21. Admin: Ban / Unban User (Temporary or Permanent)
  app.post('/api/admin/users/:id/ban', (req, res) => {
    const { id } = req.params;
    const { banStatus, durationMinutes, banReason } = req.body;
    const user = db.users.find((u) => u.id === id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.username === 'admin') {
      return res.status(400).json({ error: 'Cannot ban the root administrator account.' });
    }

    if (banStatus === 'none') {
      user.banStatus = 'none';
      user.banExpiresAt = null;
      user.banReason = '';
    } else if (banStatus === 'temporary') {
      user.banStatus = 'temporary';
      const mins = Number(durationMinutes) || 60;
      user.banExpiresAt = new Date(Date.now() + mins * 60 * 1000).toISOString();
      user.banReason = (banReason || 'Temporary suspension by administrator.').slice(0, 240);
    } else if (banStatus === 'permanent') {
      user.banStatus = 'permanent';
      user.banExpiresAt = null;
      user.banReason = (banReason || 'Permanent account ban issued by administrator.').slice(0, 240);
    }

    saveDb();
    broadcastFullState();
    return res.json({ user: sanitizeUser(user) });
  });

  // 22. Admin: Delete User
  app.delete('/api/admin/users/:id', (req, res) => {
    const { id } = req.params;
    const user = db.users.find((u) => u.id === id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.username === 'admin') {
      return res.status(400).json({ error: 'Cannot delete the root administrator account.' });
    }

    db.users = db.users.filter((u) => u.id !== id);
    for (const chat of db.chats) {
      chat.participantIds = chat.participantIds.filter((pid: string) => pid !== id);
      chat.adminIds = chat.adminIds.filter((aid: string) => aid !== id);
    }
    db.statuses = db.statuses.filter((s) => s.userId !== id);

    saveDb();
    broadcastFullState();
    return res.json({ ok: true });
  });

  // 23. Admin: Update Platform Settings (Global Theme, Read-Only, Upload Limits, Announcements)
  app.put('/api/admin/settings', (req, res) => {
    const {
      activeThemeId,
      defaultColorMode,
      maxUploadSizeMB,
      maintenanceMode,
      readOnlyMode,
      announcement,
    } = req.body;

    if (typeof activeThemeId === 'string') {
      db.settings.activeThemeId = activeThemeId;
    }
    if (defaultColorMode === 'light' || defaultColorMode === 'dark') {
      db.settings.defaultColorMode = defaultColorMode;
    }
    if (typeof maxUploadSizeMB === 'number' && maxUploadSizeMB >= 0.5 && maxUploadSizeMB <= 25) {
      db.settings.maxUploadSizeMB = maxUploadSizeMB;
    }
    if (typeof maintenanceMode === 'boolean') {
      db.settings.maintenanceMode = maintenanceMode;
    }
    if (typeof readOnlyMode === 'boolean') {
      db.settings.readOnlyMode = readOnlyMode;
    }
    if (announcement !== undefined) {
      db.settings.announcement = announcement;
    }

    saveDb();
    broadcastFullState();
    return res.json({ settings: db.settings });
  });

  // 24. Admin: Post Official Broadcast Message to All Group Chats
  app.post('/api/admin/broadcast', (req, res) => {
    const { content, severity, updateBanner } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Broadcast content is required.' });
    }

    const nowIso = new Date().toISOString();
    const adminUser = db.users.find((u) => u.role === 'admin') || db.users[0];

    if (updateBanner) {
      db.settings.announcement = {
        id: `ann-${Date.now()}`,
        text: content.trim().slice(0, 300),
        severity: severity || 'info',
        active: true,
        updatedAt: nowIso,
        authorName: adminUser.displayName,
      };
    }

    // Post into Lounge
    const lounge = db.chats.find((c) => c.id === 'chat-lounge') || db.chats[0];
    if (lounge) {
      const msg = {
        id: `msg-broadcast-${Date.now()}`,
        chatId: lounge.id,
        senderId: adminUser.id,
        type: 'text',
        content: `📢 OFFICIAL ADMIN BROADCAST:\n${content.trim()}`,
        reactions: {},
        deliveredTo: {},
        readBy: { [adminUser.id]: nowIso },
        replyToMessageId: null,
        forwardedFromName: null,
        createdAt: nowIso,
      };
      db.messages.push(msg);
      lounge.lastMessageAt = nowIso;
      lounge.pinnedMessageId = msg.id;
    }

    saveDb();
    broadcastFullState();
    return res.json({ ok: true, settings: db.settings });
  });

  // --- WEBSOCKET REAL-TIME SIGNALING (Typing, Presence, Voice Call Signaling) ---
  server.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    clients.set(ws, { userId: null });

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(String(raw));
        const { type, payload } = data;

        if (type === 'presence:online' && payload?.userId) {
          clients.set(ws, { userId: payload.userId });
          const user = db.users.find((u) => u.id === payload.userId);
          if (user) {
            user.isOnline = true;
            user.lastSeen = new Date().toISOString();
            saveDb();
            broadcastFullState();
          }
        } else if (type === 'typing:update' && payload?.chatId && payload?.userId) {
          const chat = db.chats.find((c) => c.id === payload.chatId);
          if (chat) {
            const set = new Set<string>(chat.typingUserIds || []);
            if (payload.isTyping) {
              set.add(payload.userId);
            } else {
              set.delete(payload.userId);
            }
            chat.typingUserIds = Array.from(set);
            broadcast('typing:sync', {
              chatId: chat.id,
              typingUserIds: chat.typingUserIds,
            });
          }
        } else if (type.startsWith('call:')) {
          // Relay voice call signaling (call:invite, call:accept, call:decline, call:end, call:audio-chunk)
          broadcast(type, payload);
        }
      } catch (e) {
        console.error('WS message parse error:', e);
      }
    });

    ws.on('close', () => {
      const info = clients.get(ws);
      clients.delete(ws);
      if (info?.userId) {
        const stillConnected = Array.from(clients.values()).some(
          (c) => c.userId === info.userId
        );
        if (!stillConnected) {
          const user = db.users.find((u) => u.id === info.userId);
          if (user) {
            user.isOnline = false;
            user.lastSeen = new Date().toISOString();
            saveDb();
            broadcastFullState();
          }
        }
      }
    });
  });

  // --- VITE MIDDLEWARE OR PRODUCTION STATIC ASSETS ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`PulseChat 15 server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
