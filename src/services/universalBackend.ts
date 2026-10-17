// Universal Backend & Persistence Engine
// Seamlessly handles all /api/* routes when deployed to static hosts like Vercel
// where Express server.ts is not running, preventing 404 "The page could not be found" JSON parse errors.

const STORAGE_KEY = 'pulsechat_15_persistent_db_v1';
const syncChannel =
  typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('pulsechat_15_realtime_channel')
    : null;

function createSvgAvatar(initials: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="60" fill="${bg}"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Plus Jakarta Sans, sans-serif" font-weight="700" font-size="42">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createSeededVoiceNoteWav(durationSec = 4): string {
  const sampleRate = 8000;
  const seconds = Math.max(1, Math.min(30, durationSec));
  const numSamples = sampleRate * seconds;
  const buffer = new Uint8Array(44 + numSamples);
  const view = new DataView(buffer.buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      buffer[offset + i] = str.charCodeAt(i);
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = Math.sin(Math.PI * (t / seconds)) * 0.35;
    const freq = 220 + 60 * Math.sin(2 * Math.PI * 1.5 * t);
    const val = Math.floor(128 + 127 * env * Math.sin(2 * Math.PI * freq * t));
    buffer[44 + i] = Math.max(0, Math.min(255, val));
  }

  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
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

interface ClientDatabaseSchema {
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

function getInitialSeed(): ClientDatabaseSchema {
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
      description:
        'Official private circle for all 15 community members. Announcements, polls, voice notes, and daily updates.',
      avatarUrl: createSvgAvatar('P15', '#008069'),
      participantIds: [
        'user-admin',
        'user-elena',
        'user-marcus',
        'user-aria',
        'user-liam',
      ],
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
      description:
        'Discussing our 16 global color palettes, dark mode posture, and UI polish.',
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
      content:
        'Welcome to PulseChat 15! This private workspace is strictly capped at 15 members. Enjoy real-time messaging, voice notes, 24h status updates, polls, and voice calling.',
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
      content:
        'The Material UI layout feels super clean! I also love that read receipts and emoji reactions update live across tabs.',
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
      waveform: [
        22, 48, 76, 92, 60, 84, 52, 35, 78, 95, 66, 40, 72, 88, 54, 30, 62, 80,
        45, 25,
      ],
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
          {
            id: 'opt-1',
            text: 'Emerald Classic (#00A884)',
            voterIds: ['user-elena', 'user-admin'],
          },
          {
            id: 'opt-2',
            text: 'Midnight Indigo (#4F46E5)',
            voterIds: ['user-marcus'],
          },
          {
            id: 'opt-3',
            text: 'Royal Ocean (#0284C7)',
            voterIds: ['user-aria'],
          },
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
      content:
        'We have all 16 global color schemes configured in the Admin Command Center. Any admin change re-themes the entire workspace in real time!',
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
      content:
        'Hi Admin! All 4 initial team members are onboarded. We still have 11 member slots open out of our 15-member cap.',
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
      content:
        'Shipping PulseChat 15 today — Material UI + instant read receipts + 16 live themes!',
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
      content:
        'Testing out the 16 global color schemes. Midnight Indigo and Royal Ocean look sharp in Dark Mode.',
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

function loadClientDb(): ClientDatabaseSchema {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users) && parsed.settings) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse local DB, resetting to seed:', e);
  }
  const initial = getInitialSeed();
  saveClientDb(initial);
  return initial;
}

function saveClientDb(db: ClientDatabaseSchema) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('Could not persist to localStorage:', e);
  }
}

function sanitizeUser(u: StoredUser) {
  const { password, ...rest } = u;
  return rest;
}

function runMaintenanceChecks(db: ClientDatabaseSchema): boolean {
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

  if (changed) saveClientDb(db);
  return changed;
}

function getNonAdminMemberCount(db: ClientDatabaseSchema): number {
  return db.users.filter((u) => u.role !== 'admin').length;
}

function ensureUserInDefaultChats(db: ClientDatabaseSchema, userId: string) {
  const lounge = db.chats.find((c) => c.id === 'chat-lounge');
  if (lounge && !lounge.participantIds.includes(userId)) {
    lounge.participantIds.push(userId);
  }
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

function notifyRealtimeSync(db: ClientDatabaseSchema) {
  const payload = {
    users: db.users.map(sanitizeUser),
    chats: db.chats,
    messages: db.messages,
    statuses: db.statuses,
    calls: db.calls,
    settings: db.settings,
  };
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'state:sync', payload });
    } catch {
      // ignore
    }
  }
  window.dispatchEvent(new CustomEvent('pulsechat:state-sync', { detail: payload }));
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function handleLocalApiRoute(
  method: string,
  pathname: string,
  body: any
): Response {
  const db = loadClientDb();
  runMaintenanceChecks(db);

  // 1. GET /api/bootstrap
  if (method === 'GET' && pathname === '/api/bootstrap') {
    return jsonResponse({
      users: db.users.map(sanitizeUser),
      chats: db.chats,
      messages: db.messages,
      statuses: db.statuses,
      calls: db.calls,
      settings: db.settings,
      memberCount: getNonAdminMemberCount(db),
    });
  }

  // 2. POST /api/auth/admin
  if (method === 'POST' && pathname === '/api/auth/admin') {
    const { username, password } = body || {};
    if (username === 'admin' && password === 'admin783') {
      let adminUser = db.users.find(
        (u) => u.username === 'admin' || u.role === 'admin'
      );
      if (!adminUser) {
        adminUser = getInitialSeed().users[0];
        db.users.unshift(adminUser);
      }
      adminUser.isOnline = true;
      adminUser.lastSeen = new Date().toISOString();
      ensureUserInDefaultChats(db, adminUser.id);
      saveClientDb(db);
      notifyRealtimeSync(db);
      return jsonResponse({ user: sanitizeUser(adminUser) });
    }
    return jsonResponse(
      {
        error:
          'Invalid admin credentials. Please verify your admin username and password.',
      },
      401
    );
  }

  // 3. POST /api/auth/google
  if (method === 'POST' && pathname === '/api/auth/google') {
    const { uid, email, displayName, photoURL } = body || {};
    if (!uid) {
      return jsonResponse({ error: 'Missing Google user UID.' }, 400);
    }

    const normalizedEmail = (email || '').toLowerCase().trim();
    const isBootstrappedAdmin = normalizedEmail === 'usm.7832104@gmail.com';

    let user = db.users.find(
      (u) =>
        u.id === `google-${uid}` ||
        (normalizedEmail &&
          u.email?.toLowerCase() === normalizedEmail &&
          u.authProvider === 'google')
    );

    if (!user) {
      const currentMembers = getNonAdminMemberCount(db);
      if (!isBootstrappedAdmin && currentMembers >= db.settings.maxMembers) {
        return jsonResponse(
          {
            error: `Membership limit reached (${db.settings.maxMembers}/${db.settings.maxMembers} members). Only existing members or administrators can sign in.`,
          },
          403
        );
      }

      const cleanName = (
        displayName ||
        normalizedEmail.split('@')[0] ||
        'Member'
      ).slice(0, 60);
      const initials = cleanName
        .split(' ')
        .map((p: string) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      user = {
        id: `google-${uid}`,
        username: normalizedEmail
          ? normalizedEmail.split('@')[0]
          : `user_${String(uid).slice(0, 6)}`,
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

      db.messages.push({
        id: `msg-sys-${Date.now()}`,
        chatId: 'chat-lounge',
        senderId: user.id,
        type: 'system',
        content: `${user.displayName} joined PulseChat 15 via Google Sign-In (${getNonAdminMemberCount(db)}/${db.settings.maxMembers} members).`,
        reactions: {},
        deliveredTo: {},
        readBy: {},
        createdAt: new Date().toISOString(),
      });
    } else {
      user.isOnline = true;
      user.lastSeen = new Date().toISOString();
      if (isBootstrappedAdmin) user.role = 'admin';
    }

    ensureUserInDefaultChats(db, user.id);
    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ user: sanitizeUser(user) });
  }

  // 4. POST /api/auth/password
  if (method === 'POST' && pathname === '/api/auth/password') {
    const { mode, username, password, displayName, bio } = body || {};
    const cleanUsername = (username || '').trim().toLowerCase();

    if (!cleanUsername || !password) {
      return jsonResponse({ error: 'Username and password are required.' }, 400);
    }

    if (cleanUsername === 'admin' && password === 'admin783') {
      const adminUser = db.users.find((u) => u.username === 'admin');
      if (adminUser) {
        adminUser.isOnline = true;
        adminUser.lastSeen = new Date().toISOString();
        ensureUserInDefaultChats(db, adminUser.id);
        saveClientDb(db);
        notifyRealtimeSync(db);
        return jsonResponse({ user: sanitizeUser(adminUser) });
      }
    }

    if (mode === 'register') {
      const existing = db.users.find(
        (u) => u.username.toLowerCase() === cleanUsername
      );
      if (existing) {
        return jsonResponse(
          { error: 'That username is already taken. Try signing in instead.' },
          409
        );
      }

      const currentMembers = getNonAdminMemberCount(db);
      if (currentMembers >= db.settings.maxMembers) {
        return jsonResponse(
          {
            error: `Community capacity reached (${db.settings.maxMembers}/${db.settings.maxMembers} members max). New registrations are closed.`,
          },
          403
        );
      }

      const finalDisplayName = (displayName || cleanUsername).trim().slice(0, 60);
      const initials = finalDisplayName
        .split(' ')
        .map((p: string) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      const colors = [
        '#00a884',
        '#0284c7',
        '#4f46e5',
        '#e11d48',
        '#15803d',
        '#d97706',
        '#7c3aed',
      ];
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
      ensureUserInDefaultChats(db, newUser.id);

      db.messages.push({
        id: `msg-sys-${Date.now()}`,
        chatId: 'chat-lounge',
        senderId: newUser.id,
        type: 'system',
        content: `${newUser.displayName} (@${newUser.username}) joined the community (${getNonAdminMemberCount(db)}/${db.settings.maxMembers} members).`,
        reactions: {},
        deliveredTo: {},
        readBy: {},
        createdAt: new Date().toISOString(),
      });

      saveClientDb(db);
      notifyRealtimeSync(db);
      return jsonResponse({ user: sanitizeUser(newUser) });
    } else {
      const existing = db.users.find(
        (u) => u.username.toLowerCase() === cleanUsername
      );
      if (!existing || (existing.password && existing.password !== String(password))) {
        return jsonResponse(
          {
            error:
              'Invalid username or password. You can also use a demo member (e.g. elena / password123).',
          },
          401
        );
      }
      existing.isOnline = true;
      existing.lastSeen = new Date().toISOString();
      ensureUserInDefaultChats(db, existing.id);
      saveClientDb(db);
      notifyRealtimeSync(db);
      return jsonResponse({ user: sanitizeUser(existing) });
    }
  }

  // 5. POST /api/auth/logout
  if (method === 'POST' && pathname === '/api/auth/logout') {
    const { userId } = body || {};
    const user = db.users.find((u) => u.id === userId);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date().toISOString();
      saveClientDb(db);
      notifyRealtimeSync(db);
    }
    return jsonResponse({ ok: true });
  }

  // 6. PUT /api/users/:id/profile
  const profileMatch = pathname.match(/^\/api\/users\/([^/]+)\/profile$/);
  if (method === 'PUT' && profileMatch) {
    const id = profileMatch[1];
    const { displayName, bio, customStatus, avatarUrl, phone } = body || {};
    const user = db.users.find((u) => u.id === id);
    if (!user) return jsonResponse({ error: 'User not found.' }, 404);

    if (typeof displayName === 'string' && displayName.trim()) {
      user.displayName = displayName.trim().slice(0, 60);
    }
    if (typeof bio === 'string') user.bio = bio.slice(0, 200);
    if (typeof customStatus === 'string') user.customStatus = customStatus.slice(0, 60);
    if (typeof avatarUrl === 'string' && avatarUrl.trim()) user.avatarUrl = avatarUrl;
    if (typeof phone === 'string') user.phone = phone.slice(0, 30);

    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ user: sanitizeUser(user) });
  }

  // 7. POST /api/chats
  if (method === 'POST' && pathname === '/api/chats') {
    const { type, name, description, avatarUrl, participantIds, creatorId } =
      body || {};
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return jsonResponse({ error: 'Participants required.' }, 400);
    }

    if (type === 'direct' && participantIds.length === 2) {
      const existing = db.chats.find(
        (c) =>
          c.type === 'direct' &&
          c.participantIds.length === 2 &&
          c.participantIds.includes(participantIds[0]) &&
          c.participantIds.includes(participantIds[1])
      );
      if (existing) return jsonResponse({ chat: existing });
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

    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ chat: newChat });
  }

  // 8. POST /api/messages
  if (method === 'POST' && pathname === '/api/messages') {
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
    } = body || {};

    const sender = db.users.find((u) => u.id === senderId);
    if (!sender) return jsonResponse({ error: 'Sender not found.' }, 404);
    if (sender.banStatus !== 'none') {
      return jsonResponse(
        { error: 'Your account is currently restricted from sending messages.' },
        403
      );
    }

    if (
      (db.settings.maintenanceMode || db.settings.readOnlyMode) &&
      sender.role !== 'admin'
    ) {
      return jsonResponse(
        {
          error:
            'Workspace is currently in Admin Read-Only / Maintenance Mode. Only administrators can post messages.',
        },
        403
      );
    }

    if ((type === 'image' || type === 'file') && typeof fileSize === 'number') {
      const maxBytes = db.settings.maxUploadSizeMB * 1024 * 1024;
      if (fileSize > maxBytes) {
        return jsonResponse(
          {
            error: `File exceeds the maximum upload limit of ${db.settings.maxUploadSizeMB} MB set by the administrator.`,
          },
          413
        );
      }
    }

    const chat = db.chats.find((c) => c.id === chatId);
    if (!chat) return jsonResponse({ error: 'Chat not found.' }, 404);

    const nowIso = new Date().toISOString();
    const deliveredTo: Record<string, string> = {};
    const readBy: Record<string, string> = { [senderId]: nowIso };

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

    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ message: newMessage });
  }

  // 9. POST /api/messages/:id/react
  const reactMatch = pathname.match(/^\/api\/messages\/([^/]+)\/react$/);
  if (method === 'POST' && reactMatch) {
    const id = reactMatch[1];
    const { userId, emoji } = body || {};
    const msg = db.messages.find((m) => m.id === id);
    if (!msg) return jsonResponse({ error: 'Message not found.' }, 404);

    if (!msg.reactions) msg.reactions = {};
    const currentList: string[] = msg.reactions[emoji] || [];
    if (currentList.includes(userId)) {
      msg.reactions[emoji] = currentList.filter((u) => u !== userId);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    } else {
      msg.reactions[emoji] = [...currentList, userId];
    }

    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ message: msg });
  }

  // 10. POST /api/messages/:id/poll-vote
  const pollVoteMatch = pathname.match(/^\/api\/messages\/([^/]+)\/poll-vote$/);
  if (method === 'POST' && pollVoteMatch) {
    const id = pollVoteMatch[1];
    const { userId, optionId } = body || {};
    const msg = db.messages.find((m) => m.id === id);
    if (!msg || !msg.pollData) return jsonResponse({ error: 'Poll not found.' }, 404);

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

    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ message: msg });
  }

  // 11. POST /api/chats/:id/read
  const readMatch = pathname.match(/^\/api\/chats\/([^/]+)\/read$/);
  if (method === 'POST' && readMatch) {
    const id = readMatch[1];
    const { userId } = body || {};
    if (!userId) return jsonResponse({ error: 'Missing userId' }, 400);

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
      saveClientDb(db);
      notifyRealtimeSync(db);
    }
    return jsonResponse({ ok: true });
  }

  // 12. POST /api/chats/:id/pin
  const pinMatch = pathname.match(/^\/api\/chats\/([^/]+)\/pin$/);
  if (method === 'POST' && pinMatch) {
    const id = pinMatch[1];
    const { messageId } = body || {};
    const chat = db.chats.find((c) => c.id === id);
    if (!chat) return jsonResponse({ error: 'Chat not found.' }, 404);

    chat.pinnedMessageId = chat.pinnedMessageId === messageId ? null : messageId;
    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ chat });
  }

  // 13. POST /api/users/:id/star
  const starMatch = pathname.match(/^\/api\/users\/([^/]+)\/star$/);
  if (method === 'POST' && starMatch) {
    const id = starMatch[1];
    const { messageId } = body || {};
    const user = db.users.find((u) => u.id === id);
    if (!user) return jsonResponse({ error: 'User not found.' }, 404);

    if (user.starredMessageIds.includes(messageId)) {
      user.starredMessageIds = user.starredMessageIds.filter((m) => m !== messageId);
    } else {
      user.starredMessageIds.push(messageId);
    }
    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ user: sanitizeUser(user) });
  }

  // 14. DELETE /api/messages/:id
  const deleteMsgMatch = pathname.match(/^\/api\/messages\/([^/]+)$/);
  if (method === 'DELETE' && deleteMsgMatch) {
    const id = deleteMsgMatch[1];
    const { requesterId } = body || {};
    const msg = db.messages.find((m) => m.id === id);
    if (!msg) return jsonResponse({ error: 'Message not found.' }, 404);

    const requester = db.users.find((u) => u.id === requesterId);
    const isAdmin = requester?.role === 'admin';
    if (msg.senderId !== requesterId && !isAdmin) {
      return jsonResponse({ error: 'Not authorized to delete this message.' }, 403);
    }

    msg.isDeleted = true;
    msg.deletedByAdmin = isAdmin && msg.senderId !== requesterId;
    msg.content = msg.deletedByAdmin
      ? 'This message was removed by the Platform Administrator.'
      : 'This message was deleted.';
    msg.mediaUrl = undefined;
    msg.pollData = undefined;

    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ message: msg });
  }

  // 15. POST /api/statuses
  if (method === 'POST' && pathname === '/api/statuses') {
    const {
      userId,
      type,
      content,
      mediaUrl,
      backgroundColor,
      textColor,
      caption,
    } = body || {};
    const user = db.users.find((u) => u.id === userId);
    if (!user) return jsonResponse({ error: 'User not found.' }, 404);
    if (user.banStatus !== 'none') {
      return jsonResponse(
        { error: 'Banned users cannot post status updates.' },
        403
      );
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
    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ status: newStatus });
  }

  // 16. POST /api/statuses/:id/view
  const viewStatusMatch = pathname.match(/^\/api\/statuses\/([^/]+)\/view$/);
  if (method === 'POST' && viewStatusMatch) {
    const id = viewStatusMatch[1];
    const { viewerId } = body || {};
    const status = db.statuses.find((s) => s.id === id);
    if (!status) return jsonResponse({ error: 'Status not found.' }, 404);

    if (viewerId && viewerId !== status.userId) {
      if (!status.viewers) status.viewers = {};
      status.viewers[viewerId] = new Date().toISOString();
      saveClientDb(db);
      notifyRealtimeSync(db);
    }
    return jsonResponse({ status });
  }

  // 17. DELETE /api/statuses/:id
  const deleteStatusMatch = pathname.match(/^\/api\/statuses\/([^/]+)$/);
  if (method === 'DELETE' && deleteStatusMatch) {
    const id = deleteStatusMatch[1];
    db.statuses = db.statuses.filter((s) => s.id !== id);
    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ ok: true });
  }

  // 18. POST /api/calls
  if (method === 'POST' && pathname === '/api/calls') {
    const { callerId, receiverId, chatId, status, durationSeconds } = body || {};
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
    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ call: newCall });
  }

  // 19. POST /api/admin/users
  if (method === 'POST' && pathname === '/api/admin/users') {
    const { username, password, displayName, bio, role } = body || {};
    const cleanUsername = (username || '').trim().toLowerCase();
    if (!cleanUsername || !password) {
      return jsonResponse({ error: 'Username and password are required.' }, 400);
    }
    if (db.users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return jsonResponse({ error: 'Username already exists.' }, 409);
    }

    const targetRole = role === 'admin' ? 'admin' : 'member';
    if (
      targetRole === 'member' &&
      getNonAdminMemberCount(db) >= db.settings.maxMembers
    ) {
      return jsonResponse(
        {
          error: `Cannot add member: 15-member cap (${db.settings.maxMembers}/${db.settings.maxMembers}) is already full.`,
        },
        403
      );
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
    ensureUserInDefaultChats(db, newUser.id);
    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ user: sanitizeUser(newUser) });
  }

  // 20. PUT /api/admin/users/:id
  const adminEditUserMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (method === 'PUT' && adminEditUserMatch) {
    const id = adminEditUserMatch[1];
    const { displayName, username, password, bio, customStatus, role } =
      body || {};
    const user = db.users.find((u) => u.id === id);
    if (!user) return jsonResponse({ error: 'User not found.' }, 404);

    if (typeof displayName === 'string' && displayName.trim()) {
      user.displayName = displayName.trim().slice(0, 60);
    }
    if (typeof username === 'string' && username.trim()) {
      const cleanU = username.trim().toLowerCase();
      const conflict = db.users.find(
        (u) => u.id !== id && u.username.toLowerCase() === cleanU
      );
      if (conflict) {
        return jsonResponse(
          { error: 'Username already taken by another user.' },
          409
        );
      }
      user.username = cleanU;
    }
    if (typeof password === 'string' && password.trim()) {
      user.password = password.trim();
    }
    if (typeof bio === 'string') user.bio = bio.slice(0, 200);
    if (typeof customStatus === 'string') user.customStatus = customStatus.slice(0, 60);
    if (role === 'admin' || role === 'member') user.role = role;

    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ user: sanitizeUser(user) });
  }

  // 21. POST /api/admin/users/:id/ban
  const adminBanMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/ban$/);
  if (method === 'POST' && adminBanMatch) {
    const id = adminBanMatch[1];
    const { banStatus, durationMinutes, banReason } = body || {};
    const user = db.users.find((u) => u.id === id);
    if (!user) return jsonResponse({ error: 'User not found.' }, 404);
    if (user.username === 'admin') {
      return jsonResponse(
        { error: 'Cannot ban the root administrator account.' },
        400
      );
    }

    if (banStatus === 'none') {
      user.banStatus = 'none';
      user.banExpiresAt = null;
      user.banReason = '';
    } else if (banStatus === 'temporary') {
      user.banStatus = 'temporary';
      const mins = Number(durationMinutes) || 60;
      user.banExpiresAt = new Date(Date.now() + mins * 60 * 1000).toISOString();
      user.banReason = (
        banReason || 'Temporary suspension by administrator.'
      ).slice(0, 240);
    } else if (banStatus === 'permanent') {
      user.banStatus = 'permanent';
      user.banExpiresAt = null;
      user.banReason = (
        banReason || 'Permanent account ban issued by administrator.'
      ).slice(0, 240);
    }

    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ user: sanitizeUser(user) });
  }

  // 22. DELETE /api/admin/users/:id
  const adminDeleteUserMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (method === 'DELETE' && adminDeleteUserMatch) {
    const id = adminDeleteUserMatch[1];
    const user = db.users.find((u) => u.id === id);
    if (!user) return jsonResponse({ error: 'User not found.' }, 404);
    if (user.username === 'admin') {
      return jsonResponse(
        { error: 'Cannot delete the root administrator account.' },
        400
      );
    }

    db.users = db.users.filter((u) => u.id !== id);
    for (const chat of db.chats) {
      chat.participantIds = chat.participantIds.filter(
        (pid: string) => pid !== id
      );
      chat.adminIds = chat.adminIds.filter((aid: string) => aid !== id);
    }
    db.statuses = db.statuses.filter((s) => s.userId !== id);

    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ ok: true });
  }

  // 23. PUT /api/admin/settings
  if (method === 'PUT' && pathname === '/api/admin/settings') {
    const {
      activeThemeId,
      defaultColorMode,
      maxUploadSizeMB,
      maintenanceMode,
      readOnlyMode,
      announcement,
    } = body || {};

    if (typeof activeThemeId === 'string') db.settings.activeThemeId = activeThemeId;
    if (defaultColorMode === 'light' || defaultColorMode === 'dark') {
      db.settings.defaultColorMode = defaultColorMode;
    }
    if (
      typeof maxUploadSizeMB === 'number' &&
      maxUploadSizeMB >= 0.5 &&
      maxUploadSizeMB <= 25
    ) {
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

    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ settings: db.settings });
  }

  // 24. POST /api/admin/broadcast
  if (method === 'POST' && pathname === '/api/admin/broadcast') {
    const { content, severity, updateBanner } = body || {};
    if (!content || !content.trim()) {
      return jsonResponse({ error: 'Broadcast content is required.' }, 400);
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

    saveClientDb(db);
    notifyRealtimeSync(db);
    return jsonResponse({ ok: true, settings: db.settings });
  }

  return jsonResponse({ error: `Unhandled API route: ${method} ${pathname}` }, 404);
}

// Install global fetch interceptor so /api/* requests NEVER fail with non-JSON 404s on Vercel
export function installUniversalBackendInterceptor() {
  if (typeof window === 'undefined') return;
  const originalFetch = window.fetch.bind(window);
  let useClientEngineOnly = false;

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const urlStr =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    // Only intercept /api/* routes
    if (!urlStr.startsWith('/api/') && !urlStr.includes('/api/')) {
      return originalFetch(input, init);
    }

    let pathname = urlStr;
    try {
      const parsedUrl = new URL(urlStr, window.location.origin);
      pathname = parsedUrl.pathname;
    } catch {
      // keep pathname
    }

    if (!pathname.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    const method = (init?.method || 'GET').toUpperCase();
    let parsedBody: any = undefined;
    if (init?.body && typeof init.body === 'string') {
      try {
        parsedBody = JSON.parse(init.body);
      } catch {
        parsedBody = undefined;
      }
    }

    if (useClientEngineOnly) {
      return handleLocalApiRoute(method, pathname, parsedBody);
    }

    try {
      const response = await originalFetch(input, init);
      const contentType = response.headers.get('content-type') || '';

      // If deployed on Vercel static hosting, /api/* returns 404 plain text ("The page could not be found")
      // or HTML without application/json content-type. Switch to Universal Client Engine!
      if (!contentType.includes('application/json')) {
        useClientEngineOnly = true;
        return handleLocalApiRoute(method, pathname, parsedBody);
      }

      return response;
    } catch {
      useClientEngineOnly = true;
      return handleLocalApiRoute(method, pathname, parsedBody);
    }
  };
}
