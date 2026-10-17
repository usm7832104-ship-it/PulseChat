import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Paper,
  Typography,
  Avatar,
  IconButton,
  Badge,
  TextField,
  Button,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Checkbox,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  MessageSquare,
  CircleDot,
  Phone,
  Star,
  Shield,
  Sun,
  Moon,
  LogOut,
  Plus,
  Users,
  Search,
  Check,
  CheckCheck,
  PhoneIncoming,
  PhoneOutgoing,
  Megaphone,
} from 'lucide-react';
import {
  User,
  Chat,
  Message,
  StatusStory,
  VoiceCallLog,
  PlatformSettings,
} from './types';
import { createPulseTheme, getPaletteById } from './themes';
import { firebaseSignOut } from './firebase';
import { AuthPortal } from './components/AuthPortal';
import { ChatCanvas } from './components/ChatCanvas';
import { ProfileDrawer } from './components/ProfileDrawer';
import { AdminConsole } from './components/AdminConsole';
import { StatusCreatorDialog, StatusViewerModal } from './components/StatusModal';
import { VoiceCallOverlay, ActiveCallSession } from './components/VoiceCallOverlay';

const DEFAULT_SETTINGS: PlatformSettings = {
  activeThemeId: 'whatsapp-emerald',
  defaultColorMode: 'light',
  maxMembers: 15,
  maxUploadSizeMB: 5,
  maintenanceMode: false,
  readOnlyMode: false,
  announcement: null,
};

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statuses, setStatuses] = useState<StatusStory[]>([]);
  const [calls, setCalls] = useState<VoiceCallLog[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);

  // Current Authenticated User ID (persisted in localStorage for seamless reloads)
  const [currentUserId, setCurrentUserId] = useState<string | null>(() =>
    localStorage.getItem('pulsechat_user_id')
  );

  // Personal Light / Dark mode preference
  const [userColorMode, setUserColorMode] = useState<'light' | 'dark' | null>(() => {
    const saved = localStorage.getItem('pulsechat_color_mode');
    return saved === 'light' || saved === 'dark' ? saved : null;
  });

  const effectiveColorMode: 'light' | 'dark' =
    userColorMode || settings.defaultColorMode || 'light';

  const theme = useMemo(
    () => createPulseTheme(settings.activeThemeId, effectiveColorMode),
    [settings.activeThemeId, effectiveColorMode]
  );

  const activePalette = useMemo(
    () => getPaletteById(settings.activeThemeId),
    [settings.activeThemeId]
  );

  // Navigation State
  const [navSection, setNavSection] = useState<
    'chats' | 'status' | 'calls' | 'starred' | 'admin'
  >('chats');
  const [activeChatId, setActiveChatId] = useState<string>('chat-lounge');
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'groups'>('all');
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Drawers & Modals
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [newDirectModalOpen, setNewDirectModalOpen] = useState(false);
  const [newGroupModalOpen, setNewGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);

  // Status Modals
  const [statusCreatorOpen, setStatusCreatorOpen] = useState(false);
  const [viewerStories, setViewerStories] = useState<StatusStory[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Voice Call Session
  const [callSession, setCallSession] = useState<ActiveCallSession | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const fetchBootstrap = async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) return;
      const data = await res.json();
      setUsers(data.users || []);
      setChats(data.chats || []);
      setMessages(data.messages || []);
      setStatuses(data.statuses || []);
      setCalls(data.calls || []);
      if (data.settings) setSettings(data.settings);
    } catch (err) {
      console.error('Bootstrap fetch error:', err);
    } finally {
      setLoadingBootstrap(false);
    }
  };

  useEffect(() => {
    fetchBootstrap();
  }, []);

  // Connect WebSocket & BroadcastChannel for Real-Time Synchronization (works on both Node server & Vercel static)
  useEffect(() => {
    const applyStateSync = (payload: any) => {
      if (!payload) return;
      setUsers(payload.users || []);
      setChats(payload.chats || []);
      setMessages(payload.messages || []);
      setStatuses(payload.statuses || []);
      setCalls(payload.calls || []);
      if (payload.settings) setSettings(payload.settings);
    };

    const handleRealtimeEvent = (type: string, payload: any) => {
      if (type === 'state:sync' && payload) {
        applyStateSync(payload);
      } else if (type === 'typing:sync' && payload) {
        setChats((prev) =>
          prev.map((c) =>
            c.id === payload.chatId
              ? { ...c, typingUserIds: payload.typingUserIds }
              : c
          )
        );
      } else if (type === 'call:invite' && payload) {
        if (payload.receiverId === currentUserId) {
          setCallSession({
            callId: payload.callId,
            callerId: payload.callerId,
            receiverId: payload.receiverId,
            chatId: payload.chatId,
            direction: 'incoming',
            state: 'ringing',
          });
        }
      } else if (type === 'call:accept' && payload) {
        setCallSession((prev) =>
          prev && prev.callId === payload.callId
            ? { ...prev, state: 'connected' }
            : prev
        );
      } else if ((type === 'call:decline' || type === 'call:end') && payload) {
        setCallSession((prev) =>
          prev && prev.callId === payload.callId ? null : prev
        );
      }
    };

    const onCustomSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        applyStateSync(customEvent.detail);
      }
    };
    window.addEventListener('pulsechat:state-sync', onCustomSync);

    const channel =
      typeof BroadcastChannel !== 'undefined'
        ? new BroadcastChannel('pulsechat_15_realtime_channel')
        : null;
    if (channel) {
      channel.onmessage = (ev) => {
        if (ev.data?.type) {
          handleRealtimeEvent(ev.data.type, ev.data.payload);
        }
      };
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let wsSupported = true;

    const connect = () => {
      if (!wsSupported) return;
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          if (currentUserId) {
            socket?.send(
              JSON.stringify({
                type: 'presence:online',
                payload: { userId: currentUserId },
              })
            );
          }
        };

        socket.onmessage = (event) => {
          try {
            const { type, payload } = JSON.parse(event.data);
            handleRealtimeEvent(type, payload);
          } catch {
            // ignore malformed frame
          }
        };

        socket.onerror = () => {
          // On static hosts like Vercel, /ws is not available; rely on BroadcastChannel + UniversalBackend
          wsSupported = false;
        };

        socket.onclose = () => {
          if (wsSupported) {
            reconnectTimer = setTimeout(connect, 4000);
          }
        };
      } catch {
        wsSupported = false;
      }
    };

    connect();
    return () => {
      window.removeEventListener('pulsechat:state-sync', onCustomSync);
      channel?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [currentUserId]);

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) || null,
    [users, currentUserId]
  );

  // Automatically mark messages in active chat as read
  useEffect(() => {
    if (!currentUser || !activeChatId || navSection === 'admin') return;
    const hasUnread = messages.some(
      (m) =>
        m.chatId === activeChatId &&
        m.senderId !== currentUser.id &&
        !m.readBy?.[currentUser.id]
    );
    if (hasUnread) {
      fetch(`/api/chats/${activeChatId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      }).catch(() => {});
    }
  }, [activeChatId, messages.length, currentUser?.id, navSection]);

  const handleAuthenticated = (user: User) => {
    setCurrentUserId(user.id);
    localStorage.setItem('pulsechat_user_id', user.id);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'presence:online',
          payload: { userId: user.id },
        })
      );
    }
    fetchBootstrap();
  };

  const handleLogout = async () => {
    if (currentUserId) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      }).catch(() => {});
    }
    await firebaseSignOut();
    setCurrentUserId(null);
    localStorage.removeItem('pulsechat_user_id');
    setProfileDrawerOpen(false);
    setNavSection('chats');
  };

  const toggleColorMode = () => {
    const next = effectiveColorMode === 'dark' ? 'light' : 'dark';
    setUserColorMode(next);
    localStorage.setItem('pulsechat_color_mode', next);
  };

  const memberCount = users.filter((u) => u.role !== 'admin').length;

  // Show Login or Ban Notice if not authenticated or if banned
  if (!currentUser || currentUser.banStatus !== 'none') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthPortal
          settings={settings}
          memberCount={memberCount}
          users={users}
          bannedUser={
            currentUser && currentUser.banStatus !== 'none' ? currentUser : null
          }
          onAuthenticated={handleAuthenticated}
          onSignOutBanned={handleLogout}
        />
      </ThemeProvider>
    );
  }

  // Filter chats for current user
  const myChats = chats
    .filter((c) => c.participantIds.includes(currentUser.id))
    .sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

  const activeChat =
    myChats.find((c) => c.id === activeChatId) || myChats[0] || chats[0];

  const getChatDisplayInfo = (chat: Chat) => {
    if (chat.type === 'direct') {
      const partner =
        users.find(
          (u) => chat.participantIds.includes(u.id) && u.id !== currentUser.id
        ) || users.find((u) => chat.participantIds.includes(u.id));
      return {
        title: partner?.displayName || chat.name,
        avatar: partner?.avatarUrl || chat.avatarUrl,
        isOnline: partner?.isOnline || false,
      };
    }
    return {
      title: chat.name,
      avatar: chat.avatarUrl,
      isOnline: false,
    };
  };

  const getUnreadCountForChat = (chatId: string) =>
    messages.filter(
      (m) =>
        m.chatId === chatId &&
        m.senderId !== currentUser.id &&
        !m.readBy?.[currentUser.id] &&
        m.type !== 'system'
    ).length;

  const totalUnreadChats = myChats.filter(
    (c) => getUnreadCountForChat(c.id) > 0
  ).length;

  const filteredChats = myChats.filter((c) => {
    const info = getChatDisplayInfo(c);
    if (
      sidebarSearch.trim() &&
      !info.title.toLowerCase().includes(sidebarSearch.toLowerCase())
    ) {
      return false;
    }
    if (chatFilter === 'unread') return getUnreadCountForChat(c.id) > 0;
    if (chatFilter === 'groups') return c.type === 'group';
    return true;
  });

  // Group active 24h status stories by userId
  const statusesByUser = users
    .map((u) => ({
      user: u,
      stories: statuses.filter((s) => s.userId === u.id),
    }))
    .filter((entry) => entry.stories.length > 0);

  const myStarredMessages = messages.filter((m) =>
    currentUser.starredMessageIds?.includes(m.id)
  );

  // Handlers for ChatCanvas
  const handleSendMessage = async (payload: Partial<Message>) => {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setToast(data.error || 'Could not send message');
      return;
    }
    fetchBootstrap();
  };

  const handleReactMessage = async (messageId: string, emoji: string) => {
    await fetch(`/api/messages/${messageId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, emoji }),
    });
    fetchBootstrap();
  };

  const handleVotePoll = async (messageId: string, optionId: string) => {
    await fetch(`/api/messages/${messageId}/poll-vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, optionId }),
    });
    fetchBootstrap();
  };

  const handlePinMessage = async (messageId: string) => {
    if (!activeChat) return;
    await fetch(`/api/chats/${activeChat.id}/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    });
    fetchBootstrap();
  };

  const handleStarMessage = async (messageId: string) => {
    await fetch(`/api/users/${currentUser.id}/star`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    });
    fetchBootstrap();
  };

  const handleDeleteMessage = async (messageId: string) => {
    await fetch(`/api/messages/${messageId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requesterId: currentUser.id }),
    });
    fetchBootstrap();
  };

  const handleTypingChange = (isTyping: boolean) => {
    if (!activeChat || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'typing:update',
        payload: {
          chatId: activeChat.id,
          userId: currentUser.id,
          isTyping,
        },
      })
    );
  };

  const handleStartDirectChatWith = async (targetUser: User) => {
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'direct',
        name: targetUser.displayName,
        participantIds: [currentUser.id, targetUser.id],
        creatorId: currentUser.id,
      }),
    });
    const data = await res.json();
    if (res.ok && data.chat) {
      await fetchBootstrap();
      setActiveChatId(data.chat.id);
      setNavSection('chats');
      setNewDirectModalOpen(false);
    }
  };

  const handleCreateGroupChat = async () => {
    if (!groupName.trim()) return;
    const participants = Array.from(
      new Set([currentUser.id, ...selectedGroupMemberIds])
    );
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'group',
        name: groupName.trim(),
        description: groupDesc.trim(),
        participantIds: participants,
        creatorId: currentUser.id,
      }),
    });
    const data = await res.json();
    if (res.ok && data.chat) {
      await fetchBootstrap();
      setActiveChatId(data.chat.id);
      setNavSection('chats');
      setGroupName('');
      setGroupDesc('');
      setSelectedGroupMemberIds([]);
      setNewGroupModalOpen(false);
    }
  };

  const handleReplyToStatus = async (story: StatusStory, replyText: string) => {
    const storyAuthor = users.find((u) => u.id === story.userId);
    if (!storyAuthor) return;

    const chatRes = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'direct',
        name: storyAuthor.displayName,
        participantIds: [currentUser.id, storyAuthor.id],
        creatorId: currentUser.id,
      }),
    });
    const chatData = await chatRes.json();
    if (chatRes.ok && chatData.chat) {
      await handleSendMessage({
        chatId: chatData.chat.id,
        senderId: currentUser.id,
        type: 'text',
        content: `[Replied to 24h Status: "${story.content.slice(0, 40)}"]\n${replyText}`,
      });
      setActiveChatId(chatData.chat.id);
      setNavSection('chats');
      setToast(`Sent status reply to ${storyAuthor.displayName}`);
    }
  };

  // Voice-Only Audio Call Signaling
  const handleStartVoiceCall = (targetUserId: string, chatId?: string) => {
    const callId = `call-${Date.now()}`;
    const session: ActiveCallSession = {
      callId,
      callerId: currentUser.id,
      receiverId: targetUserId,
      chatId,
      direction: 'outgoing',
      state: 'ringing',
    };
    setCallSession(session);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'call:invite',
          payload: session,
        })
      );
    }

    // Auto-connect voice call after 1.5s if target member is online or demo member
    setTimeout(() => {
      setCallSession((prev) =>
        prev && prev.callId === callId ? { ...prev, state: 'connected' } : prev
      );
    }, 1500);
  };

  const handleAcceptCall = () => {
    if (!callSession) return;
    setCallSession({ ...callSession, state: 'connected' });
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'call:accept',
          payload: { callId: callSession.callId },
        })
      );
    }
  };

  const handleDeclineCall = async () => {
    if (!callSession) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'call:decline',
          payload: { callId: callSession.callId },
        })
      );
    }
    await fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callerId: callSession.callerId,
        receiverId: callSession.receiverId,
        chatId: callSession.chatId,
        status: 'missed',
        durationSeconds: 0,
      }),
    });
    setCallSession(null);
    fetchBootstrap();
  };

  const handleEndCall = async (durationSeconds: number) => {
    if (!callSession) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'call:end',
          payload: { callId: callSession.callId },
        })
      );
    }
    await fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callerId: callSession.callerId,
        receiverId: callSession.receiverId,
        chatId: callSession.chatId,
        status: 'completed',
        durationSeconds,
      }),
    });
    setCallSession(null);
    fetchBootstrap();
  };

  if (loadingBootstrap) {
    return null;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          height: '100dvh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          overflow: 'hidden',
        }}
      >
        {/* Global Admin Announcement Banner */}
        {settings.announcement?.active && (
          <Alert
            severity={settings.announcement.severity || 'info'}
            icon={<Megaphone size={18} />}
            sx={{
              borderRadius: 0,
              py: 0.4,
              px: 2.5,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" fontWeight={600}>
              {settings.announcement.text}
            </Typography>
          </Alert>
        )}

        {/* Main 3-Pane WhatsApp Workspace */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* PANE 1: Left Navigation Rail */}
          <Paper
            elevation={0}
            sx={{
              width: 68,
              borderRight: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 2,
              bgcolor:
                effectiveColorMode === 'dark'
                  ? '#111b21'
                  : activePalette.sidebarHeaderLight,
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'center' }}>
              <Tooltip title="Profile & Bio Customization" placement="right">
                <IconButton onClick={() => setProfileDrawerOpen(true)} sx={{ p: 0.5 }}>
                  <Avatar
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName}
                    sx={{
                      width: 40,
                      height: 40,
                      border: '2px solid rgba(255,255,255,0.85)',
                    }}
                  />
                </IconButton>
              </Tooltip>

              <Divider sx={{ width: 32, borderColor: 'rgba(255,255,255,0.2)' }} />

              <Tooltip title="Chats" placement="right">
                <IconButton
                  onClick={() => setNavSection('chats')}
                  sx={{
                    color: '#fff',
                    bgcolor:
                      navSection === 'chats'
                        ? 'rgba(255,255,255,0.22)'
                        : 'transparent',
                  }}
                >
                  <Badge badgeContent={totalUnreadChats} color="error">
                    <MessageSquare size={21} />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Tooltip title="24-Hour Status Updates" placement="right">
                <IconButton
                  onClick={() => setNavSection('status')}
                  sx={{
                    color: '#fff',
                    bgcolor:
                      navSection === 'status'
                        ? 'rgba(255,255,255,0.22)'
                        : 'transparent',
                  }}
                >
                  <Badge badgeContent={statuses.length} color="secondary">
                    <CircleDot size={21} />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Tooltip title="Voice-Only Calls" placement="right">
                <IconButton
                  onClick={() => setNavSection('calls')}
                  sx={{
                    color: '#fff',
                    bgcolor:
                      navSection === 'calls'
                        ? 'rgba(255,255,255,0.22)'
                        : 'transparent',
                  }}
                >
                  <Phone size={21} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Starred Messages" placement="right">
                <IconButton
                  onClick={() => setNavSection('starred')}
                  sx={{
                    color: '#fff',
                    bgcolor:
                      navSection === 'starred'
                        ? 'rgba(255,255,255,0.22)'
                        : 'transparent',
                  }}
                >
                  <Star size={21} />
                </IconButton>
              </Tooltip>

              {currentUser.role === 'admin' && (
                <Tooltip title="Admin Command Center" placement="right">
                  <IconButton
                    onClick={() => setNavSection('admin')}
                    sx={{
                      color: '#fff',
                      bgcolor:
                        navSection === 'admin'
                          ? 'rgba(255,255,255,0.28)'
                          : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <Shield size={21} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, alignItems: 'center' }}>
              <Tooltip
                title={`Switch to ${
                  effectiveColorMode === 'dark' ? 'Light' : 'Dark'
                } Mode`}
                placement="right"
              >
                <IconButton onClick={toggleColorMode} sx={{ color: '#fff' }}>
                  {effectiveColorMode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </IconButton>
              </Tooltip>

              <Tooltip title="Sign Out" placement="right">
                <IconButton onClick={handleLogout} sx={{ color: '#fff' }}>
                  <LogOut size={20} />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>

          {/* PANE 2 & 3: Either Admin Command Center OR Split Directory + Chat Canvas */}
          {navSection === 'admin' && currentUser.role === 'admin' ? (
            <AdminConsole
              currentUser={currentUser}
              users={users}
              chats={chats}
              messages={messages}
              settings={settings}
              onBackToChats={() => setNavSection('chats')}
              onRefreshState={fetchBootstrap}
            />
          ) : (
            <>
              {/* PANE 2: Middle Directory Column */}
              <Paper
                elevation={0}
                sx={{
                  width: { xs: 300, md: 360 },
                  borderRight: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  flexShrink: 0,
                  height: '100%',
                }}
              >
                {/* Directory Header */}
                <Box
                  sx={{
                    px: 2,
                    py: 1.75,
                    borderBottom: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      {navSection === 'chats'
                        ? 'Chats'
                        : navSection === 'status'
                        ? '24h Status'
                        : navSection === 'calls'
                        ? 'Voice Calls'
                        : 'Starred Messages'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" className="tabular-nums">
                      {memberCount}/{settings.maxMembers} Members · {activePalette.name}
                    </Typography>
                  </Box>

                  {navSection === 'chats' && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="New 1-on-1 Direct Chat">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => setNewDirectModalOpen(true)}
                        >
                          <Plus size={19} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Create Group Chat">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => setNewGroupModalOpen(true)}
                        >
                          <Users size={19} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}

                  {navSection === 'status' && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<Plus size={15} />}
                      onClick={() => setStatusCreatorOpen(true)}
                    >
                      Post Status
                    </Button>
                  )}
                </Box>

                {/* Search & Filter Controls for Chats */}
                {navSection === 'chats' && (
                  <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Search chats or members..."
                      value={sidebarSearch}
                      onChange={(e) => setSidebarSearch(e.target.value)}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <Search
                              size={16}
                              style={{ marginRight: 8, opacity: 0.6 }}
                            />
                          ),
                        },
                      }}
                      sx={{ mb: 1.25 }}
                    />
                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                      {(['all', 'unread', 'groups'] as const).map((f) => (
                        <Button
                          key={f}
                          size="small"
                          variant={chatFilter === f ? 'contained' : 'outlined'}
                          onClick={() => setChatFilter(f)}
                          sx={{ py: 0.3, px: 1.5, fontSize: '0.75rem', flex: 1 }}
                        >
                          {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Groups'}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Directory Scrollable List */}
                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                  {navSection === 'chats' &&
                    filteredChats.map((chat) => {
                      const info = getChatDisplayInfo(chat);
                      const unread = getUnreadCountForChat(chat.id);
                      const chatMsgs = messages.filter((m) => m.chatId === chat.id);
                      const lastMsg = chatMsgs[chatMsgs.length - 1];
                      const isSelected = activeChat?.id === chat.id;

                      return (
                        <Box
                          key={chat.id}
                          onClick={() => setActiveChatId(chat.id)}
                          sx={{
                            px: 2,
                            py: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            cursor: 'pointer',
                            borderBottom: 1,
                            borderColor: 'divider',
                            bgcolor: isSelected ? 'action.selected' : 'transparent',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <Avatar src={info.avatar} alt={info.title} sx={{ width: 46, height: 46 }} />
                          <Box sx={{ flex: 1, overflow: 'hidden' }}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: 0.25,
                              }}
                            >
                              <Typography variant="subtitle2" noWrap fontWeight={700}>
                                {info.title}
                              </Typography>
                              {lastMsg && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  className="tabular-nums"
                                >
                                  {new Date(lastMsg.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </Typography>
                              )}
                            </Box>

                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  overflow: 'hidden',
                                }}
                              >
                                {lastMsg && lastMsg.senderId === currentUser.id && (
                                  <Box
                                    component="span"
                                    sx={{
                                      display: 'inline-flex',
                                      color:
                                        Object.keys(lastMsg.readBy || {}).length > 1
                                          ? '#0284c7'
                                          : 'text.secondary',
                                    }}
                                  >
                                    {Object.keys(lastMsg.deliveredTo || {}).length > 0 ? (
                                      <CheckCheck size={14} />
                                    ) : (
                                      <Check size={14} />
                                    )}
                                  </Box>
                                )}
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {lastMsg ? lastMsg.content : chat.description || 'No messages yet'}
                                </Typography>
                              </Box>

                              {unread > 0 && (
                                <Box
                                  className="tabular-nums"
                                  sx={{
                                    bgcolor: 'primary.main',
                                    color: '#fff',
                                    borderRadius: 3,
                                    px: 0.85,
                                    py: 0.1,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  {unread}
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}

                  {/* STATUS DIRECTORY */}
                  {navSection === 'status' && (
                    <Box sx={{ p: 2 }}>
                      <Paper
                        variant="outlined"
                        onClick={() => setStatusCreatorOpen(true)}
                        sx={{
                          p: 1.5,
                          mb: 2.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          cursor: 'pointer',
                        }}
                      >
                        <Avatar src={currentUser.avatarUrl} />
                        <Box>
                          <Typography variant="subtitle2">My Status</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Tap to post a 24-hour photo or text update
                          </Typography>
                        </Box>
                      </Paper>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={700}
                        display="block"
                        sx={{ mb: 1 }}
                      >
                        Recent Updates (24h Window)
                      </Typography>

                      {statusesByUser.map(({ user, stories }) => (
                        <Box
                          key={user.id}
                          onClick={() => {
                            setViewerStories(stories);
                            setViewerOpen(true);
                          }}
                          sx={{
                            py: 1.25,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            cursor: 'pointer',
                            borderBottom: 1,
                            borderColor: 'divider',
                          }}
                        >
                          <Avatar
                            src={user.avatarUrl}
                            sx={{
                              width: 46,
                              height: 46,
                              border: `3px solid ${activePalette.primary}`,
                            }}
                          />
                          <Box>
                            <Typography variant="subtitle2">{user.displayName}</Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              className="tabular-nums"
                            >
                              {stories.length} {stories.length === 1 ? 'slide' : 'slides'} ·{' '}
                              {new Date(stories[0].createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* VOICE CALLS DIRECTORY */}
                  {navSection === 'calls' && (
                    <Box sx={{ p: 2 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={700}
                        display="block"
                        sx={{ mb: 1 }}
                      >
                        Start Voice-Only Call with Member
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1.5, mb: 2 }}>
                        {users
                          .filter((u) => u.id !== currentUser.id)
                          .map((u) => (
                            <Button
                              key={u.id}
                              size="small"
                              variant="outlined"
                              onClick={() => handleStartVoiceCall(u.id)}
                              sx={{ flexShrink: 0 }}
                            >
                              <Avatar
                                src={u.avatarUrl}
                                sx={{ width: 22, height: 22, mr: 0.75 }}
                              />
                              {u.displayName.split(' ')[0]}
                            </Button>
                          ))}
                      </Box>

                      <Divider sx={{ mb: 1.5 }} />

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={700}
                        display="block"
                        sx={{ mb: 1 }}
                      >
                        Recent Call History
                      </Typography>

                      {calls.map((call) => {
                        const isOutgoing = call.callerId === currentUser.id;
                        const partnerId = isOutgoing ? call.receiverId : call.callerId;
                        const partner = users.find((u) => u.id === partnerId);

                        return (
                          <Box
                            key={call.id}
                            sx={{
                              py: 1.25,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderBottom: 1,
                              borderColor: 'divider',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar src={partner?.avatarUrl} />
                              <Box>
                                <Typography variant="subtitle2">
                                  {partner?.displayName || 'Community Member'}
                                </Typography>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    color:
                                      call.status === 'missed'
                                        ? 'error.main'
                                        : 'text.secondary',
                                  }}
                                >
                                  {isOutgoing ? (
                                    <PhoneOutgoing size={13} />
                                  ) : (
                                    <PhoneIncoming size={13} />
                                  )}
                                  <Typography variant="caption" className="tabular-nums">
                                    {call.status === 'missed'
                                      ? 'Missed voice call'
                                      : `${Math.floor(call.durationSeconds / 60)}m ${
                                          call.durationSeconds % 60
                                        }s`}{' '}
                                    ·{' '}
                                    {new Date(call.startedAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>

                            <IconButton
                              color="primary"
                              onClick={() => handleStartVoiceCall(partnerId, call.chatId)}
                            >
                              <Phone size={18} />
                            </IconButton>
                          </Box>
                        );
                      })}
                    </Box>
                  )}

                  {/* STARRED MESSAGES DIRECTORY */}
                  {navSection === 'starred' && (
                    <Box sx={{ p: 2 }}>
                      {myStarredMessages.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No starred messages yet. Use the message menu in any chat to star
                          important notes.
                        </Typography>
                      ) : (
                        myStarredMessages.map((msg) => {
                          const sender = users.find((u) => u.id === msg.senderId);
                          const msgChat = chats.find((c) => c.id === msg.chatId);
                          return (
                            <Paper
                              key={msg.id}
                              variant="outlined"
                              onClick={() => {
                                setActiveChatId(msg.chatId);
                                setNavSection('chats');
                              }}
                              sx={{ p: 1.5, mb: 1.5, cursor: 'pointer' }}
                            >
                              <Typography variant="caption" fontWeight={700} color="primary.main">
                                {sender?.displayName} in {msgChat?.name || 'Chat'}
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {msg.content}
                              </Typography>
                            </Paper>
                          );
                        })
                      )}
                    </Box>
                  )}
                </Box>
              </Paper>

              {/* PANE 3: Active Conversation Canvas */}
              {activeChat && (
                <ChatCanvas
                  chat={activeChat}
                  currentUser={currentUser}
                  users={users}
                  chats={chats}
                  messages={messages}
                  settings={settings}
                  colorMode={effectiveColorMode}
                  onSendMessage={handleSendMessage}
                  onReactMessage={handleReactMessage}
                  onVotePoll={handleVotePoll}
                  onPinMessage={handlePinMessage}
                  onStarMessage={handleStarMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onStartVoiceCall={handleStartVoiceCall}
                  onTypingChange={handleTypingChange}
                />
              )}
            </>
          )}
        </Box>

        {/* Slide-Over WhatsApp Profile & Bio Customization Drawer */}
        <ProfileDrawer
          open={profileDrawerOpen}
          user={currentUser}
          colorMode={effectiveColorMode}
          maxUploadSizeMB={settings.maxUploadSizeMB}
          onToggleColorMode={toggleColorMode}
          onClose={() => setProfileDrawerOpen(false)}
          onUpdated={() => fetchBootstrap()}
          onLogout={handleLogout}
        />

        {/* Dialog: Start New Direct 1-on-1 Chat */}
        <Dialog
          open={newDirectModalOpen}
          onClose={() => setNewDirectModalOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Start 1-on-1 Chat with Member</DialogTitle>
          <DialogContent dividers>
            <List dense disablePadding>
              {users
                .filter((u) => u.id !== currentUser.id)
                .map((u) => (
                  <ListItem
                    key={u.id}
                    secondaryAction={
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleStartDirectChatWith(u)}
                      >
                        Message
                      </Button>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar src={u.avatarUrl} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={u.displayName}
                      secondary={u.bio}
                    />
                  </ListItem>
                ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewDirectModalOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog: Create Custom Group Chat */}
        <Dialog
          open={newGroupModalOpen}
          onClose={() => setNewGroupModalOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Create New Group Chat</DialogTitle>
          <DialogContent dividers>
            <TextField
              label="Group Name"
              fullWidth
              size="small"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Group Description"
              fullWidth
              size="small"
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              Select Group Participants
            </Typography>
            <List dense disablePadding>
              {users
                .filter((u) => u.id !== currentUser.id)
                .map((u) => {
                  const checked = selectedGroupMemberIds.includes(u.id);
                  return (
                    <ListItem
                      key={u.id}
                      disableGutters
                      secondaryAction={
                        <Checkbox
                          edge="end"
                          checked={checked}
                          onChange={() =>
                            setSelectedGroupMemberIds((prev) =>
                              checked
                                ? prev.filter((id) => id !== u.id)
                                : [...prev, u.id]
                            )
                          }
                        />
                      }
                    >
                      <ListItemAvatar>
                        <Avatar src={u.avatarUrl} sx={{ width: 30, height: 30 }} />
                      </ListItemAvatar>
                      <ListItemText primary={u.displayName} />
                    </ListItem>
                  );
                })}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewGroupModalOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button variant="contained" onClick={handleCreateGroupChat}>
              Create Group
            </Button>
          </DialogActions>
        </Dialog>

        {/* 24-Hour Status Creator & Viewer Modals */}
        <StatusCreatorDialog
          open={statusCreatorOpen}
          currentUser={currentUser}
          maxUploadSizeMB={settings.maxUploadSizeMB}
          onClose={() => setStatusCreatorOpen(false)}
          onCreated={fetchBootstrap}
        />

        <StatusViewerModal
          open={viewerOpen}
          stories={viewerStories}
          initialIndex={0}
          currentUser={currentUser}
          users={users}
          onClose={() => setViewerOpen(false)}
          onReplyToStatus={handleReplyToStatus}
          onDeleted={fetchBootstrap}
        />

        {/* Voice-Only Audio Call Overlay */}
        <VoiceCallOverlay
          session={callSession}
          currentUser={currentUser}
          users={users}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          onEndCall={handleEndCall}
        />

        <Snackbar
          open={Boolean(toast)}
          autoHideDuration={4000}
          onClose={() => setToast(null)}
          message={toast || ''}
        />
      </Box>
    </ThemeProvider>
  );
}
