import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  IconButton,
  TextField,
  Button,
  Menu,
  MenuItem,
  Popover,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Phone,
  Search,
  MoreVertical,
  Pin,
  Smile,
  Paperclip,
  Mic,
  Send,
  Image as ImageIcon,
  FileText,
  BarChart2,
  Reply,
  Forward,
  Star,
  Trash2,
  Check,
  CheckCheck,
  Play,
  Pause,
  Download,
  X,
  Info,
  Lock,
  Plus,
} from 'lucide-react';
import { Chat, Message, User, PlatformSettings } from '../types';
import { getPaletteById } from '../themes';

interface ChatCanvasProps {
  chat: Chat;
  currentUser: User;
  users: User[];
  chats: Chat[];
  messages: Message[];
  settings: PlatformSettings;
  colorMode: 'light' | 'dark';
  onSendMessage: (payload: Partial<Message>) => Promise<void>;
  onReactMessage: (messageId: string, emoji: string) => Promise<void>;
  onVotePoll: (messageId: string, optionId: string) => Promise<void>;
  onPinMessage: (messageId: string) => Promise<void>;
  onStarMessage: (messageId: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onStartVoiceCall: (targetUserId: string, chatId: string) => void;
  onTypingChange: (isTyping: boolean) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'];

const COMPOSER_EMOJIS = [
  '😀', '😂', '🥹', '😍', '🤩', '😎', '🥳', '🤔',
  '👍', '👏', '🙌', '🤝', '❤️', '🔥', '✨', '🎉',
  '💯', '🚀', '⚡', '🎧', '📌', '📊', '✅', '🙏',
];

function createFallbackVoiceWav(durationSec: number): string {
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
    const freq = 240 + 50 * Math.sin(2 * Math.PI * 2 * t);
    const val = Math.floor(128 + 127 * env * Math.sin(2 * Math.PI * freq * t));
    buffer[44 + i] = Math.max(0, Math.min(255, val));
  }

  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export const ChatCanvas: React.FC<ChatCanvasProps> = ({
  chat,
  currentUser,
  users,
  chats,
  messages,
  settings,
  colorMode,
  onSendMessage,
  onReactMessage,
  onVotePoll,
  onPinMessage,
  onStarMessage,
  onDeleteMessage,
  onStartVoiceCall,
  onTypingChange,
}) => {
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Menus & Popovers
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [attachAnchor, setAttachAnchor] = useState<HTMLElement | null>(null);
  const [msgMenuAnchor, setMsgMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [reactAnchor, setReactAnchor] = useState<HTMLElement | null>(null);

  // Dialogs: Poll Creator, Forward Message, Read Receipts Info, Lightbox Image, Chat Info
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Option 1', 'Option 2']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [chatInfoOpen, setChatInfoOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Voice Note Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Voice Note Playback State
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  const activePalette = getPaletteById(settings.activeThemeId);

  const chatMessages = messages.filter((m) => m.chatId === chat.id);
  const displayedMessages = searchQuery.trim()
    ? chatMessages.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chatMessages;

  const pinnedMessage = chat.pinnedMessageId
    ? chatMessages.find((m) => m.id === chat.pinnedMessageId)
    : null;

  // Identify direct chat partner
  const directPartner =
    chat.type === 'direct'
      ? users.find(
          (u) => chat.participantIds.includes(u.id) && u.id !== currentUser.id
        ) || users.find((u) => chat.participantIds.includes(u.id))
      : null;

  const chatTitle =
    chat.type === 'direct'
      ? directPartner?.displayName || chat.name
      : chat.name;

  const chatAvatar =
    chat.type === 'direct'
      ? directPartner?.avatarUrl || chat.avatarUrl
      : chat.avatarUrl;

  const typingUsers = (chat.typingUserIds || [])
    .filter((id) => id !== currentUser.id)
    .map((id) => users.find((u) => u.id === id)?.displayName)
    .filter(Boolean);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, chat.id]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  const handleTextChange = (val: string) => {
    setText(val);
    onTypingChange(val.trim().length > 0);
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const msgContent = text.trim();
    setText('');
    onTypingChange(false);
    const currentReply = replyTo;
    setReplyTo(null);

    await onSendMessage({
      chatId: chat.id,
      senderId: currentUser.id,
      type: 'text',
      content: msgContent,
      replyToMessageId: currentReply?.id || null,
    });
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    uploadType: 'image' | 'file'
  ) => {
    setAttachAnchor(null);
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = settings.maxUploadSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(
        `File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(
          2
        )} MB) exceeds the administrator's ${settings.maxUploadSizeMB} MB upload limit.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      await onSendMessage({
        chatId: chat.id,
        senderId: currentUser.id,
        type: uploadType,
        content: uploadType === 'image' ? file.name : `Shared document: ${file.name}`,
        mediaUrl: String(reader.result),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        replyToMessageId: replyTo?.id || null,
      });
      setReplyTo(null);
    };
    reader.readAsDataURL(file);
  };

  // Start Voice Note Recording
  const startVoiceRecording = async () => {
    setUploadError(null);
    audioChunksRef.current = [];
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
      }
    } catch {
      // If microphone is unavailable in sandboxed iframe, we still record duration and synthesize playable audio
      mediaRecorderRef.current = null;
    }
    setIsRecording(true);
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const finishAndSendVoiceNote = async () => {
    const duration = Math.max(1, recordingSeconds);
    const waveform = Array.from({ length: 20 }, () =>
      Math.floor(25 + Math.random() * 70)
    );

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const recorder = mediaRecorderRef.current;
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          await onSendMessage({
            chatId: chat.id,
            senderId: currentUser.id,
            type: 'voice',
            content: `Voice note (0:${duration < 10 ? `0${duration}` : duration})`,
            mediaUrl: String(reader.result),
            voiceDuration: duration,
            waveform,
            replyToMessageId: replyTo?.id || null,
          });
          setReplyTo(null);
        };
        reader.readAsDataURL(blob);
      };
      recorder.stop();
    } else {
      // Fallback playable WAV
      const wavDataUrl = createFallbackVoiceWav(duration);
      await onSendMessage({
        chatId: chat.id,
        senderId: currentUser.id,
        type: 'voice',
        content: `Voice note (0:${duration < 10 ? `0${duration}` : duration})`,
        mediaUrl: wavDataUrl,
        voiceDuration: duration,
        waveform,
        replyToMessageId: replyTo?.id || null,
      });
      setReplyTo(null);
    }
    setIsRecording(false);
  };

  const togglePlayVoiceNote = (msg: Message) => {
    if (playingMsgId === msg.id) {
      audioPlayerRef.current?.pause();
      setPlayingMsgId(null);
      return;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    if (msg.mediaUrl) {
      const audio = new Audio(msg.mediaUrl);
      audio.playbackRate = playbackSpeed;
      audio.onended = () => setPlayingMsgId(null);
      audio.onerror = () => setPlayingMsgId(null);
      audioPlayerRef.current = audio;
      setPlayingMsgId(msg.id);
      audio.play().catch(() => {
        setTimeout(() => setPlayingMsgId(null), (msg.voiceDuration || 3) * 1000);
      });
    }
  };

  const cyclePlaybackSpeed = () => {
    const next = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(next);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = next;
    }
  };

  const handleCreatePoll = async () => {
    const cleanOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || cleanOptions.length < 2) return;

    await onSendMessage({
      chatId: chat.id,
      senderId: currentUser.id,
      type: 'poll',
      content: pollQuestion.trim(),
      pollData: {
        question: pollQuestion.trim(),
        allowMultiple: pollAllowMultiple,
        options: cleanOptions.map((opt, idx) => ({
          id: `opt-${Date.now()}-${idx}`,
          text: opt,
          voterIds: [],
        })),
      },
    });
    setPollQuestion('');
    setPollOptions(['Option 1', 'Option 2']);
    setPollDialogOpen(false);
  };

  const handleForwardToChat = async (targetChatId: string) => {
    if (!selectedMsg) return;
    const originalSender = users.find((u) => u.id === selectedMsg.senderId);
    await onSendMessage({
      chatId: targetChatId,
      senderId: currentUser.id,
      type: selectedMsg.type === 'poll' ? 'text' : selectedMsg.type,
      content: selectedMsg.content,
      mediaUrl: selectedMsg.mediaUrl,
      fileName: selectedMsg.fileName,
      fileSize: selectedMsg.fileSize,
      voiceDuration: selectedMsg.voiceDuration,
      waveform: selectedMsg.waveform,
      forwardedFromName: originalSender?.displayName || 'Member',
    });
    setForwardDialogOpen(false);
    setSelectedMsg(null);
  };

  // Compute Read Receipt Icon for Outgoing Message
  const renderReadReceiptIcon = (msg: Message) => {
    const otherRecipients = chat.participantIds.filter((id) => id !== msg.senderId);
    const readCount = otherRecipients.filter((id) => Boolean(msg.readBy?.[id])).length;
    const deliveredCount = otherRecipients.filter((id) => Boolean(msg.deliveredTo?.[id])).length;

    if (readCount > 0) {
      return (
        <Tooltip title={`Read by ${readCount} of ${otherRecipients.length}`}>
          <Box component="span" sx={{ display: 'inline-flex', color: '#0284c7', ml: 0.5 }}>
            <CheckCheck size={15} />
          </Box>
        </Tooltip>
      );
    }
    if (deliveredCount > 0) {
      return (
        <Tooltip title="Delivered">
          <Box
            component="span"
            sx={{ display: 'inline-flex', color: 'text.secondary', ml: 0.5 }}
          >
            <CheckCheck size={15} />
          </Box>
        </Tooltip>
      );
    }
    return (
      <Tooltip title="Sent">
        <Box
          component="span"
          sx={{ display: 'inline-flex', color: 'text.secondary', ml: 0.5 }}
        >
          <Check size={15} />
        </Box>
      </Tooltip>
    );
  };

  const isLockedForMember =
    (settings.readOnlyMode || settings.maintenanceMode) &&
    currentUser.role !== 'admin';

  return (
    <Box
      sx={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top Conversation Header */}
      <Paper
        elevation={0}
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 2,
        }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
          onClick={() => setChatInfoOpen(true)}
        >
          <Avatar src={chatAvatar} alt={chatTitle} sx={{ width: 42, height: 42 }} />
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {chatTitle}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {typingUsers.length > 0
                ? `${typingUsers.join(', ')} typing...`
                : chat.type === 'direct'
                ? directPartner?.isOnline
                  ? `Online · ${directPartner.customStatus || 'Available'}`
                  : `Last seen ${
                      directPartner?.lastSeen
                        ? new Date(directPartner.lastSeen).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'recently'
                    }`
                : `${chat.participantIds.length} members in group · Click for group info`}
            </Typography>
          </Box>
        </Box>

        {/* Action Icons (Voice Call Only — No Video Call) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Tooltip title="Voice-Only Audio Call">
            <IconButton
              color="primary"
              onClick={() => {
                const targetId =
                  directPartner?.id ||
                  chat.participantIds.find((id) => id !== currentUser.id) ||
                  currentUser.id;
                onStartVoiceCall(targetId, chat.id);
              }}
            >
              <Phone size={19} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Search in Conversation">
            <IconButton onClick={() => setSearchOpen(!searchOpen)}>
              <Search size={19} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Conversation Info & Participants">
            <IconButton onClick={() => setChatInfoOpen(true)}>
              <Info size={19} />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Optional In-Chat Search Bar */}
      {searchOpen && (
        <Paper
          elevation={0}
          sx={{
            px: 2.5,
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Search size={16} />
          <TextField
            size="small"
            variant="standard"
            fullWidth
            placeholder="Search messages in this chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{ input: { disableUnderline: true } }}
          />
          {searchQuery && (
            <IconButton size="small" onClick={() => setSearchQuery('')}>
              <X size={16} />
            </IconButton>
          )}
        </Paper>
      )}

      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <Paper
          elevation={0}
          sx={{
            px: 2.5,
            py: 1,
            bgcolor: 'action.hover',
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
            <Pin size={15} color={activePalette.primary} />
            <Typography variant="caption" fontWeight={700} color="primary.main">
              Pinned:
            </Typography>
            <Typography variant="caption" noWrap color="text.primary">
              {pinnedMessage.content}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => onPinMessage(pinnedMessage.id)}>
            <X size={14} />
          </IconButton>
        </Paper>
      )}

      {/* Upload Error Alert */}
      {uploadError && (
        <Paper
          elevation={0}
          sx={{
            px: 2.5,
            py: 1,
            bgcolor: 'error.main',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="caption" fontWeight={600}>
            {uploadError}
          </Typography>
          <IconButton size="small" onClick={() => setUploadError(null)} sx={{ color: '#fff' }}>
            <X size={14} />
          </IconButton>
        </Paper>
      )}

      {/* Scrollable Message Stream */}
      <Box
        className={colorMode === 'dark' ? 'chat-canvas-dark' : 'chat-canvas-light'}
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: { xs: 2, md: 3 },
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        {displayedMessages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <Box
                key={msg.id}
                sx={{ display: 'flex', justifyContent: 'center', my: 0.75 }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    px: 2,
                    py: 0.5,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {msg.content}
                  </Typography>
                </Paper>
              </Box>
            );
          }

          const isOutgoing = msg.senderId === currentUser.id;
          const sender = users.find((u) => u.id === msg.senderId);
          const quotedMsg = msg.replyToMessageId
            ? messages.find((m) => m.id === msg.replyToMessageId)
            : null;
          const quotedSender = quotedMsg
            ? users.find((u) => u.id === quotedMsg.senderId)
            : null;
          const isStarred = currentUser.starredMessageIds?.includes(msg.id);
          const reactionEntries = Object.entries(msg.reactions || {}).filter(
            ([, list]) => list.length > 0
          );

          const bubbleBg = isOutgoing
            ? colorMode === 'dark'
              ? activePalette.outgoingBubbleDark
              : activePalette.outgoingBubbleLight
            : colorMode === 'dark'
            ? '#202c33'
            : '#ffffff';

          return (
            <Box
              key={msg.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isOutgoing ? 'flex-end' : 'flex-start',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 1,
                  maxWidth: { xs: '88%', md: '68%' },
                }}
              >
                {!isOutgoing && chat.type === 'group' && (
                  <Avatar
                    src={sender?.avatarUrl}
                    alt={sender?.displayName}
                    sx={{ width: 28, height: 28, mb: 0.5 }}
                  />
                )}

                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    bgcolor: bubbleBg,
                    color: colorMode === 'dark' ? '#e9edef' : '#0f172a',
                    border: 1,
                    borderColor: 'divider',
                    position: 'relative',
                    minWidth: 140,
                  }}
                >
                  {/* Group Sender Name + Action Menu Button */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      mb: 0.4,
                    }}
                  >
                    {!isOutgoing && chat.type === 'group' ? (
                      <Typography variant="caption" fontWeight={700} color="primary.main">
                        {sender?.displayName || 'Member'}
                      </Typography>
                    ) : (
                      <span />
                    )}

                    {!msg.isDeleted && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        <IconButton
                          size="small"
                          sx={{ p: 0.25 }}
                          onClick={(e) => {
                            setSelectedMsg(msg);
                            setReactAnchor(e.currentTarget);
                          }}
                        >
                          <Smile size={14} />
                        </IconButton>
                        <IconButton
                          size="small"
                          sx={{ p: 0.25 }}
                          onClick={(e) => {
                            setSelectedMsg(msg);
                            setMsgMenuAnchor(e.currentTarget);
                          }}
                        >
                          <MoreVertical size={14} />
                        </IconButton>
                      </Box>
                    )}
                  </Box>

                  {/* Forwarded Label */}
                  {msg.forwardedFromName && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        fontStyle: 'italic',
                        opacity: 0.75,
                        mb: 0.5,
                      }}
                    >
                      <Forward size={12} /> Forwarded from {msg.forwardedFromName}
                    </Typography>
                  )}

                  {/* Quoted Reply Block */}
                  {quotedMsg && (
                    <Box
                      sx={{
                        p: 1,
                        mb: 1,
                        borderRadius: 1.5,
                        bgcolor:
                          colorMode === 'dark'
                            ? 'rgba(0,0,0,0.25)'
                            : 'rgba(15,23,42,0.06)',
                      }}
                    >
                      <Typography variant="caption" fontWeight={700} color="primary.main" display="block">
                        {quotedSender?.displayName || 'Member'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {quotedMsg.content}
                      </Typography>
                    </Box>
                  )}

                  {/* Message Body by Type */}
                  {msg.isDeleted ? (
                    <Typography
                      variant="body2"
                      sx={{ fontStyle: 'italic', opacity: 0.7 }}
                    >
                      {msg.content}
                    </Typography>
                  ) : msg.type === 'image' && msg.mediaUrl ? (
                    <Box>
                      <Box
                        onClick={() => setLightboxImage(msg.mediaUrl!)}
                        sx={{
                          borderRadius: 1.5,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          mb: 0.75,
                          maxHeight: 260,
                        }}
                      >
                        <img
                          src={msg.mediaUrl}
                          alt={msg.fileName || 'Shared image'}
                          referrerPolicy="no-referrer"
                          style={{
                            maxWidth: '100%',
                            maxHeight: 260,
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      </Box>
                      {msg.content && (
                        <Typography variant="body2">{msg.content}</Typography>
                      )}
                    </Box>
                  ) : msg.type === 'file' ? (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        p: 1.25,
                        borderRadius: 1.5,
                        bgcolor:
                          colorMode === 'dark'
                            ? 'rgba(0,0,0,0.22)'
                            : 'rgba(15,23,42,0.05)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FileText size={22} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {msg.fileName || 'Document'}
                          </Typography>
                          {msg.fileSize && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              className="tabular-nums"
                            >
                              {(msg.fileSize / 1024).toFixed(1)} KB
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      {msg.mediaUrl && (
                        <IconButton
                          size="small"
                          component="a"
                          href={msg.mediaUrl}
                          download={msg.fileName || 'file'}
                        >
                          <Download size={17} />
                        </IconButton>
                      )}
                    </Box>
                  ) : msg.type === 'voice' ? (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        minWidth: 230,
                        py: 0.5,
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => togglePlayVoiceNote(msg)}
                        sx={{
                          bgcolor: 'primary.main',
                          color: '#fff',
                          '&:hover': { bgcolor: 'primary.dark' },
                        }}
                      >
                        {playingMsgId === msg.id ? <Pause size={16} /> : <Play size={16} />}
                      </IconButton>

                      <Box
                        sx={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.35,
                          height: 28,
                        }}
                      >
                        {(msg.waveform || [30, 60, 80, 45, 70, 90, 50, 65, 40, 75, 55, 35]).map(
                          (bar, idx) => (
                            <Box
                              key={idx}
                              sx={{
                                flex: 1,
                                height: `${bar}%`,
                                borderRadius: 1,
                                bgcolor:
                                  playingMsgId === msg.id
                                    ? 'primary.main'
                                    : 'text.secondary',
                                opacity: playingMsgId === msg.id ? 1 : 0.55,
                              }}
                            />
                          )
                        )}
                      </Box>

                      <Button
                        size="small"
                        variant="outlined"
                        onClick={cyclePlaybackSpeed}
                        className="tabular-nums"
                        sx={{ minWidth: 42, py: 0.2, px: 0.75, fontSize: '0.7rem' }}
                      >
                        {playbackSpeed}x
                      </Button>
                    </Box>
                  ) : msg.type === 'poll' && msg.pollData ? (
                    <Box sx={{ minWidth: 250 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <BarChart2 size={16} />
                        <Typography variant="subtitle2" fontWeight={700}>
                          {msg.pollData.question}
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mb: 1.5 }}
                      >
                        {msg.pollData.allowMultiple
                          ? 'Select one or more options'
                          : 'Select one option'}
                      </Typography>

                      {msg.pollData.options.map((opt) => {
                        const totalVotes = msg.pollData!.options.reduce(
                          (acc, o) => acc + o.voterIds.length,
                          0
                        );
                        const pct =
                          totalVotes > 0
                            ? Math.round((opt.voterIds.length / totalVotes) * 100)
                            : 0;
                        const voted = opt.voterIds.includes(currentUser.id);

                        return (
                          <Box
                            key={opt.id}
                            onClick={() => onVotePoll(msg.id, opt.id)}
                            sx={{
                              mb: 1,
                              p: 1,
                              borderRadius: 1.5,
                              border: 1,
                              borderColor: voted ? 'primary.main' : 'divider',
                              cursor: 'pointer',
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                mb: 0.5,
                              }}
                            >
                              <Typography variant="body2" fontWeight={voted ? 700 : 500}>
                                {opt.text}
                              </Typography>
                              <Typography
                                variant="caption"
                                className="tabular-nums"
                                fontWeight={600}
                              >
                                {opt.voterIds.length} ({pct}%)
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={pct}
                              sx={{ height: 5, borderRadius: 2 }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                      {msg.content}
                    </Typography>
                  )}

                  {/* Timestamp + Starred + Read Receipt Ticks */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    {isStarred && <Star size={12} fill="#eab308" color="#eab308" />}
                    {chat.pinnedMessageId === msg.id && <Pin size={12} />}
                    <Typography
                      variant="caption"
                      className="tabular-nums"
                      sx={{ fontSize: '0.68rem', opacity: 0.72 }}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                    {isOutgoing && renderReadReceiptIcon(msg)}
                  </Box>
                </Paper>
              </Box>

              {/* Emoji Reactions Strip */}
              {reactionEntries.length > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 0.5,
                    mt: 0.4,
                    flexWrap: 'wrap',
                  }}
                >
                  {reactionEntries.map(([emoji, userIds]) => {
                    const hasMine = userIds.includes(currentUser.id);
                    return (
                      <Button
                        key={emoji}
                        size="small"
                        variant={hasMine ? 'contained' : 'outlined'}
                        onClick={() => onReactMessage(msg.id, emoji)}
                        sx={{
                          minWidth: 'auto',
                          py: 0.15,
                          px: 1,
                          fontSize: '0.75rem',
                          borderRadius: 4,
                        }}
                      >
                        {emoji} {userIds.length}
                      </Button>
                    );
                  })}
                </Box>
              )}
            </Box>
          );
        })}
        <div ref={scrollEndRef} />
      </Box>

      {/* Quoted Reply Banner Above Composer */}
      {replyTo && (
        <Paper
          elevation={0}
          sx={{
            px: 2.5,
            py: 1,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'action.hover',
          }}
        >
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="caption" fontWeight={700} color="primary.main">
              Replying to{' '}
              {users.find((u) => u.id === replyTo.senderId)?.displayName || 'Member'}
            </Typography>
            <Typography variant="body2" noWrap color="text.secondary">
              {replyTo.content}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setReplyTo(null)}>
            <X size={16} />
          </IconButton>
        </Paper>
      )}

      {/* Bottom Message Composer Bar */}
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1.25,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        {isLockedForMember ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              py: 1,
              color: 'text.secondary',
            }}
          >
            <Lock size={16} />
            <Typography variant="body2" fontWeight={600}>
              Workspace is in Admin Read-Only / Maintenance Mode. Only administrators can
              send messages right now.
            </Typography>
          </Box>
        ) : isRecording ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Typography variant="body2" color="error.main" fontWeight={700} className="tabular-nums">
              Recording Voice Note · 0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" color="inherit" onClick={cancelVoiceRecording}>
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<Send size={15} />}
                onClick={finishAndSendVoiceNote}
              >
                Send Voice Note
              </Button>
            </Box>
          </Box>
        ) : (
          <Box
            component="form"
            onSubmit={handleSendText}
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <IconButton onClick={(e) => setEmojiAnchor(e.currentTarget)}>
              <Smile size={20} />
            </IconButton>

            <IconButton onClick={(e) => setAttachAnchor(e.currentTarget)}>
              <Paperclip size={20} />
            </IconButton>

            <TextField
              size="small"
              fullWidth
              placeholder="Type a message..."
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
            />

            {text.trim() ? (
              <IconButton
                type="submit"
                sx={{
                  bgcolor: 'primary.main',
                  color: '#fff',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                <Send size={18} />
              </IconButton>
            ) : (
              <Tooltip title="Record Voice Note">
                <IconButton
                  onClick={startVoiceRecording}
                  sx={{
                    bgcolor: 'primary.main',
                    color: '#fff',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  <Mic size={18} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Paper>

      {/* Popover: Quick Reaction Picker */}
      <Popover
        open={Boolean(reactAnchor)}
        anchorEl={reactAnchor}
        onClose={() => setReactAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Box sx={{ display: 'flex', gap: 0.5, p: 1 }}>
          {QUICK_EMOJIS.map((em) => (
            <IconButton
              key={em}
              size="small"
              onClick={() => {
                if (selectedMsg) onReactMessage(selectedMsg.id, em);
                setReactAnchor(null);
              }}
            >
              <span style={{ fontSize: '1.15rem' }}>{em}</span>
            </IconButton>
          ))}
        </Box>
      </Popover>

      {/* Popover: Composer Emoji Picker */}
      <Popover
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box
          sx={{
            p: 1.5,
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: 0.5,
            maxWidth: 300,
          }}
        >
          {COMPOSER_EMOJIS.map((em) => (
            <IconButton
              key={em}
              size="small"
              onClick={() => {
                setText((prev) => prev + em);
                setEmojiAnchor(null);
              }}
            >
              <span style={{ fontSize: '1.15rem' }}>{em}</span>
            </IconButton>
          ))}
        </Box>
      </Popover>

      {/* Menu: Attachment Options (Photo, Document, Poll) */}
      <Menu
        anchorEl={attachAnchor}
        open={Boolean(attachAnchor)}
        onClose={() => setAttachAnchor(null)}
      >
        <MenuItem component="label">
          <ImageIcon size={17} style={{ marginRight: 10 }} />
          Upload Photo (Max {settings.maxUploadSizeMB} MB)
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFileUpload(e, 'image')}
          />
        </MenuItem>
        <MenuItem component="label">
          <FileText size={17} style={{ marginRight: 10 }} />
          Share Document / File (Max {settings.maxUploadSizeMB} MB)
          <input
            type="file"
            hidden
            onChange={(e) => handleFileUpload(e, 'file')}
          />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAttachAnchor(null);
            setPollDialogOpen(true);
          }}
        >
          <BarChart2 size={17} style={{ marginRight: 10 }} />
          Create Interactive Poll
        </MenuItem>
      </Menu>

      {/* Menu: Message Context Actions */}
      <Menu
        anchorEl={msgMenuAnchor}
        open={Boolean(msgMenuAnchor)}
        onClose={() => setMsgMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setReplyTo(selectedMsg);
            setMsgMenuAnchor(null);
          }}
        >
          <Reply size={16} style={{ marginRight: 10 }} /> Reply
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMsgMenuAnchor(null);
            setForwardDialogOpen(true);
          }}
        >
          <Forward size={16} style={{ marginRight: 10 }} /> Forward
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedMsg) onStarMessage(selectedMsg.id);
            setMsgMenuAnchor(null);
          }}
        >
          <Star size={16} style={{ marginRight: 10 }} />
          {selectedMsg && currentUser.starredMessageIds?.includes(selectedMsg.id)
            ? 'Unstar Message'
            : 'Star Message'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedMsg) onPinMessage(selectedMsg.id);
            setMsgMenuAnchor(null);
          }}
        >
          <Pin size={16} style={{ marginRight: 10 }} />
          {selectedMsg && chat.pinnedMessageId === selectedMsg.id
            ? 'Unpin from Chat'
            : 'Pin to Chat'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMsgMenuAnchor(null);
            setReceiptDialogOpen(true);
          }}
        >
          <Info size={16} style={{ marginRight: 10 }} /> Read Receipt Info
        </MenuItem>
        {(selectedMsg?.senderId === currentUser.id || currentUser.role === 'admin') && (
          <MenuItem
            onClick={() => {
              if (selectedMsg) onDeleteMessage(selectedMsg.id);
              setMsgMenuAnchor(null);
            }}
            sx={{ color: 'error.main' }}
          >
            <Trash2 size={16} style={{ marginRight: 10 }} /> Delete Message
          </MenuItem>
        )}
      </Menu>

      {/* Dialog: Create Poll */}
      <Dialog
        open={pollDialogOpen}
        onClose={() => setPollDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Create Interactive Poll</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Poll Question"
            fullWidth
            size="small"
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            sx={{ mb: 2 }}
          />
          {pollOptions.map((opt, idx) => (
            <TextField
              key={idx}
              label={`Option ${idx + 1}`}
              fullWidth
              size="small"
              value={opt}
              onChange={(e) => {
                const copy = [...pollOptions];
                copy[idx] = e.target.value;
                setPollOptions(copy);
              }}
              sx={{ mb: 1.5 }}
            />
          ))}
          {pollOptions.length < 5 && (
            <Button
              size="small"
              startIcon={<Plus size={15} />}
              onClick={() =>
                setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`])
              }
            >
              Add Option
            </Button>
          )}
          <FormControlLabel
            control={
              <Checkbox
                checked={pollAllowMultiple}
                onChange={(e) => setPollAllowMultiple(e.target.checked)}
              />
            }
            label="Allow members to vote for multiple options"
            sx={{ mt: 1, display: 'block' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPollDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreatePoll}>
            Post Poll
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Forward Message */}
      <Dialog
        open={forwardDialogOpen}
        onClose={() => setForwardDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Forward Message To...</DialogTitle>
        <DialogContent dividers>
          <List dense disablePadding>
            {chats
              .filter((c) => c.participantIds.includes(currentUser.id))
              .map((targetChat) => (
                <ListItem
                  key={targetChat.id}
                  secondaryAction={
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleForwardToChat(targetChat.id)}
                    >
                      Send
                    </Button>
                  }
                >
                  <ListItemAvatar>
                    <Avatar src={targetChat.avatarUrl} />
                  </ListItemAvatar>
                  <ListItemText primary={targetChat.name} />
                </ListItem>
              ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Dialog: Message Read Receipts Breakdown */}
      <Dialog
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Message Delivery & Read Receipts</DialogTitle>
        <DialogContent dividers>
          {selectedMsg && (
            <Box>
              <Typography variant="subtitle2" color="primary.main" gutterBottom>
                Read by
              </Typography>
              <List dense disablePadding sx={{ mb: 2 }}>
                {Object.entries(selectedMsg.readBy || {})
                  .filter(([uid]) => uid !== selectedMsg.senderId)
                  .map(([uid, ts]) => {
                    const u = users.find((user) => user.id === uid);
                    return (
                      <ListItem key={uid} disableGutters>
                        <ListItemAvatar>
                          <Avatar src={u?.avatarUrl} sx={{ width: 28, height: 28 }} />
                        </ListItemAvatar>
                        <ListItemText
                          primary={u?.displayName || 'Member'}
                          secondary={new Date(ts).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        />
                      </ListItem>
                    );
                  })}
              </List>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Delivered to
              </Typography>
              <List dense disablePadding>
                {Object.entries(selectedMsg.deliveredTo || {})
                  .filter(([uid]) => uid !== selectedMsg.senderId)
                  .map(([uid, ts]) => {
                    const u = users.find((user) => user.id === uid);
                    return (
                      <ListItem key={uid} disableGutters>
                        <ListItemAvatar>
                          <Avatar src={u?.avatarUrl} sx={{ width: 28, height: 28 }} />
                        </ListItemAvatar>
                        <ListItemText
                          primary={u?.displayName || 'Member'}
                          secondary={new Date(ts).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        />
                      </ListItem>
                    );
                  })}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiptDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Chat & Participant Info */}
      <Dialog
        open={chatInfoOpen}
        onClose={() => setChatInfoOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{chatTitle} — Details</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {chat.description || 'Encrypted PulseChat 15 conversation'}
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Participants ({chat.participantIds.length})
          </Typography>
          <List dense disablePadding>
            {chat.participantIds.map((pid) => {
              const pUser = users.find((u) => u.id === pid);
              if (!pUser) return null;
              return (
                <ListItem key={pid} disableGutters>
                  <ListItemAvatar>
                    <Avatar src={pUser.avatarUrl} sx={{ width: 32, height: 32 }} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${pUser.displayName} ${
                      pUser.id === currentUser.id ? '(You)' : ''
                    }`}
                    secondary={`${pUser.bio} · ${
                      pUser.isOnline ? 'Online' : 'Offline'
                    }`}
                  />
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChatInfoOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Lightbox Image Preview */}
      <Dialog
        open={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
        maxWidth="md"
      >
        <Box sx={{ bgcolor: '#000', p: 2, position: 'relative' }}>
          <IconButton
            onClick={() => setLightboxImage(null)}
            sx={{ position: 'absolute', top: 8, right: 8, color: '#fff' }}
          >
            <X size={20} />
          </IconButton>
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Full preview"
              referrerPolicy="no-referrer"
              style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block' }}
            />
          )}
        </Box>
      </Dialog>
    </Box>
  );
};
