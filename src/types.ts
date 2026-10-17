export type AuthProviderType = 'google' | 'password' | 'admin';
export type UserRole = 'member' | 'admin';
export type BanStatus = 'none' | 'temporary' | 'permanent';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  authProvider: AuthProviderType;
  avatarUrl: string;
  bio: string;
  customStatus: string;
  phone?: string;
  role: UserRole;
  isOnline: boolean;
  lastSeen: string;
  banStatus: BanStatus;
  banExpiresAt?: string | null;
  banReason?: string;
  starredMessageIds: string[];
  createdAt: string;
}

export type ChatType = 'direct' | 'group';

export interface Chat {
  id: string;
  type: ChatType;
  name: string;
  description?: string;
  avatarUrl?: string;
  participantIds: string[];
  adminIds: string[];
  pinnedMessageId?: string | null;
  createdAt: string;
  lastMessageAt: string;
  typingUserIds?: string[];
}

export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'poll' | 'system';

export interface PollOption {
  id: string;
  text: string;
  voterIds: string[];
}

export interface PollData {
  question: string;
  allowMultiple: boolean;
  options: PollOption[];
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  voiceDuration?: number;
  waveform?: number[];
  pollData?: PollData;
  replyToMessageId?: string | null;
  forwardedFromName?: string | null;
  reactions: Record<string, string[]>; // emoji -> array of userIds
  deliveredTo: Record<string, string>; // userId -> ISO timestamp
  readBy: Record<string, string>; // userId -> ISO timestamp
  isDeleted?: boolean;
  deletedByAdmin?: boolean;
  createdAt: string;
}

export interface StatusStory {
  id: string;
  userId: string;
  type: 'image' | 'text';
  content: string;
  mediaUrl?: string;
  backgroundColor: string;
  textColor?: string;
  caption?: string;
  viewers: Record<string, string>; // userId -> ISO timestamp
  createdAt: string;
  expiresAt: string;
}

export type CallStatus = 'ringing' | 'ongoing' | 'completed' | 'missed' | 'declined';

export interface VoiceCallLog {
  id: string;
  callerId: string;
  receiverId: string;
  chatId?: string;
  status: CallStatus;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
}

export interface AnnouncementBanner {
  id: string;
  text: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  active: boolean;
  updatedAt: string;
  authorName: string;
}

export interface PlatformSettings {
  activeThemeId: string;
  defaultColorMode: 'light' | 'dark';
  maxMembers: number;
  maxUploadSizeMB: number;
  maintenanceMode: boolean;
  readOnlyMode: boolean;
  announcement: AnnouncementBanner | null;
}

export interface ThemePaletteOption {
  id: string;
  name: string;
  category: string;
  primary: string;
  secondary: string;
  accent: string;
  outgoingBubbleLight: string;
  outgoingBubbleDark: string;
  sidebarHeaderLight: string;
  sidebarHeaderDark: string;
}

export interface BootstrapState {
  users: User[];
  chats: Chat[];
  messages: Message[];
  statuses: StatusStory[];
  calls: VoiceCallLog[];
  settings: PlatformSettings;
}
