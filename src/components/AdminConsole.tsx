import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Alert,
  LinearProgress,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Users,
  Palette,
  Megaphone,
  Shield,
  UserPlus,
  Edit3,
  Ban,
  Trash2,
  CheckCircle2,
  Unlock,
  ArrowLeft,
  Send,
} from 'lucide-react';
import { User, PlatformSettings, Message, Chat } from '../types';
import { GLOBAL_THEME_PALETTES } from '../themes';

interface AdminConsoleProps {
  currentUser: User;
  users: User[];
  chats: Chat[];
  messages: Message[];
  settings: PlatformSettings;
  onBackToChats: () => void;
  onRefreshState: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  currentUser,
  users,
  chats,
  messages,
  settings,
  onBackToChats,
  onRefreshState,
}) => {
  const [tab, setTab] = useState<'users' | 'themes' | 'broadcast' | 'moderation'>('users');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Add / Edit User Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formRole, setFormRole] = useState<'member' | 'admin'>('member');

  // Ban Modal State
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banTargetUser, setBanTargetUser] = useState<User | null>(null);
  const [banType, setBanType] = useState<'temporary' | 'permanent'>('temporary');
  const [banDurationMinutes, setBanDurationMinutes] = useState<number>(60);
  const [banReason, setBanReason] = useState('Violation of community rules');

  // Broadcast State
  const [broadcastText, setBroadcastText] = useState(
    settings.announcement?.text || ''
  );
  const [broadcastSeverity, setBroadcastSeverity] = useState<
    'info' | 'warning' | 'error' | 'success'
  >(settings.announcement?.severity || 'info');
  const [postToLounge, setPostToLounge] = useState(true);

  // Moderation Search
  const [modSearch, setModSearch] = useState('');

  const nonAdminCount = users.filter((u) => u.role !== 'admin').length;

  const openAddUserModal = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormDisplayName('');
    setFormPassword('welcome123');
    setFormBio('Hey there! I am using PulseChat 15.');
    setFormRole('member');
    setUserModalOpen(true);
  };

  const openEditUserModal = (u: User) => {
    setEditingUser(u);
    setFormUsername(u.username);
    setFormDisplayName(u.displayName);
    setFormPassword('');
    setFormBio(u.bio);
    setFormRole(u.role);
    setUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formUsername,
            displayName: formDisplayName,
            password: formPassword || undefined,
            bio: formBio,
            role: formRole,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update user');
        setFeedback({ type: 'success', text: `Updated ${data.user.displayName}.` });
      } else {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formUsername,
            displayName: formDisplayName,
            password: formPassword,
            bio: formBio,
            role: formRole,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create user');
        setFeedback({ type: 'success', text: `Added ${data.user.displayName} to roster.` });
      }
      setUserModalOpen(false);
      onRefreshState();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const openBanDialog = (u: User) => {
    setBanTargetUser(u);
    setBanType('temporary');
    setBanDurationMinutes(60);
    setBanReason('Temporary suspension by administrator');
    setBanModalOpen(true);
  };

  const handleConfirmBan = async () => {
    if (!banTargetUser) return;
    try {
      const res = await fetch(`/api/admin/users/${banTargetUser.id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banStatus: banType,
          durationMinutes: banDurationMinutes,
          banReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ban action failed');
      setFeedback({
        type: 'success',
        text: `${banTargetUser.displayName} has been ${
          banType === 'permanent' ? 'permanently banned' : 'temporarily suspended'
        }.`,
      });
      setBanModalOpen(false);
      onRefreshState();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleUnbanUser = async (u: User) => {
    try {
      const res = await fetch(`/api/admin/users/${u.id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banStatus: 'none' }),
      });
      if (!res.ok) throw new Error('Failed to unban user');
      setFeedback({ type: 'success', text: `Restored access for ${u.displayName}.` });
      onRefreshState();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleDeleteUser = async (u: User) => {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      setFeedback({ type: 'success', text: `Deleted user ${u.displayName}.` });
      onRefreshState();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleUpdateSettings = async (patch: Partial<PlatformSettings>) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');
      setFeedback({
        type: 'success',
        text: 'Global platform settings updated in real time for all members.',
      });
      onRefreshState();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleTriggerBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    try {
      if (postToLounge) {
        const res = await fetch('/api/admin/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: broadcastText.trim(),
            severity: broadcastSeverity,
            updateBanner: true,
          }),
        });
        if (!res.ok) throw new Error('Broadcast failed');
      } else {
        await handleUpdateSettings({
          announcement: {
            id: `ann-${Date.now()}`,
            text: broadcastText.trim(),
            severity: broadcastSeverity,
            active: true,
            updatedAt: new Date().toISOString(),
            authorName: currentUser.displayName,
          },
        });
      }
      setFeedback({
        type: 'success',
        text: 'System announcement published to all connected members.',
      });
      onRefreshState();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleAdminDeleteMessage = async (msgId: string) => {
    try {
      const res = await fetch(`/api/messages/${msgId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: currentUser.id }),
      });
      if (!res.ok) throw new Error('Failed to moderate message');
      setFeedback({ type: 'success', text: 'Message removed by Admin Moderation.' });
      onRefreshState();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const filteredMessages = messages
    .filter((m) => !m.isDeleted && m.type !== 'system')
    .filter(
      (m) =>
        !modSearch.trim() ||
        m.content.toLowerCase().includes(modSearch.toLowerCase())
    )
    .slice()
    .reverse();

  return (
    <Box
      sx={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      {/* Top Admin Header */}
      <Paper
        elevation={0}
        sx={{
          px: 3,
          py: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowLeft size={16} />}
            onClick={onBackToChats}
          >
            Back to Chats
          </Button>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Admin Command Center
            </Typography>
            <Typography variant="caption" color="text.secondary" className="tabular-nums">
              Signed in as @{currentUser.username} · Capacity: {nonAdminCount} /{' '}
              {settings.maxMembers} Members · {GLOBAL_THEME_PALETTES.length} Global Color Themes
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<UserPlus size={17} />}
          onClick={openAddUserModal}
          disabled={nonAdminCount >= settings.maxMembers}
        >
          Add New Member ({nonAdminCount}/{settings.maxMembers})
        </Button>
      </Paper>

      {/* Navigation Tabs */}
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab
            value="users"
            icon={<Users size={17} />}
            iconPosition="start"
            label={`User Management (${users.length})`}
          />
          <Tab
            value="themes"
            icon={<Palette size={17} />}
            iconPosition="start"
            label={`Global Themes (${GLOBAL_THEME_PALETTES.length})`}
          />
          <Tab
            value="broadcast"
            icon={<Megaphone size={17} />}
            iconPosition="start"
            label="Announcements & Broadcasts"
          />
          <Tab
            value="moderation"
            icon={<Shield size={17} />}
            iconPosition="start"
            label="Moderation & Lockdown"
          />
        </Tabs>
      </Paper>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 3 } }}>
        {feedback && (
          <Alert
            severity={feedback.type}
            sx={{ mb: 2.5 }}
            onClose={() => setFeedback(null)}
          >
            {feedback.text}
          </Alert>
        )}

        {/* TAB 1: USER MANAGEMENT (ADD, EDIT, BAN TEMP/PERM, DELETE) */}
        {tab === 'users' && (
          <Box>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                mb: 3,
                border: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 3,
                flexWrap: 'wrap',
              }}
            >
              <Box sx={{ flex: 1, minWidth: 240 }}>
                <Typography variant="subtitle2" gutterBottom>
                  15-Member Community Capacity Meter
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (nonAdminCount / settings.maxMembers) * 100)}
                  sx={{ height: 8, borderRadius: 4, mb: 0.75 }}
                />
                <Typography variant="caption" color="text.secondary" className="tabular-nums">
                  {nonAdminCount} of {settings.maxMembers} member slots occupied ·{' '}
                  {Math.max(0, settings.maxMembers - nonAdminCount)} slots remaining
                </Typography>
              </Box>
            </Paper>

            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ border: 1, borderColor: 'divider' }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>Username & Auth</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Presence & Status</TableCell>
                    <TableCell>Account Standing</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar src={u.avatarUrl} alt={u.displayName} sx={{ width: 34, height: 34 }} />
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {u.displayName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {u.bio}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="tabular-nums">
                          @{u.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {u.authProvider}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          color={u.role === 'admin' ? 'primary.main' : 'text.secondary'}
                        >
                          {u.role === 'admin' ? 'Administrator' : 'Member'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          color={u.isOnline ? 'success.main' : 'text.secondary'}
                          fontWeight={600}
                        >
                          {u.isOnline ? 'Online now' : 'Offline'} · {u.customStatus || 'Available'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {u.banStatus === 'none' ? (
                          <Typography variant="caption" color="success.main" fontWeight={600}>
                            Active
                          </Typography>
                        ) : u.banStatus === 'temporary' ? (
                          <Box>
                            <Typography variant="caption" color="warning.main" fontWeight={700}>
                              Temp Banned
                            </Typography>
                            {u.banExpiresAt && (
                              <Typography
                                variant="caption"
                                display="block"
                                color="text.secondary"
                                className="tabular-nums"
                              >
                                Until{' '}
                                {new Date(u.banExpiresAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="error.main" fontWeight={700}>
                            Permanently Banned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                          <Tooltip title="Edit User Details">
                            <IconButton size="small" onClick={() => openEditUserModal(u)}>
                              <Edit3 size={16} />
                            </IconButton>
                          </Tooltip>

                          {u.username !== 'admin' && (
                            <>
                              {u.banStatus === 'none' ? (
                                <Tooltip title="Ban User (Temporary or Permanent)">
                                  <IconButton
                                    size="small"
                                    color="warning"
                                    onClick={() => openBanDialog(u)}
                                  >
                                    <Ban size={16} />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                <Tooltip title="Lift Ban / Restore Access">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleUnbanUser(u)}
                                  >
                                    <Unlock size={16} />
                                  </IconButton>
                                </Tooltip>
                              )}

                              <Tooltip title="Delete User">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteUser(u)}
                                >
                                  <Trash2 size={16} />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* TAB 2: GLOBAL THEME STUDIO (16+ COLOR SCHEMES) */}
        {tab === 'themes' && (
          <Box>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                mb: 3,
                border: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Global Material UI Color Scheme ({GLOBAL_THEME_PALETTES.length} Palettes)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecting any theme below immediately updates the active color scheme across
                  all connected members. Users can still toggle Light or Dark mode.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="body2" fontWeight={600}>
                  Default Mode:
                </Typography>
                <Button
                  size="small"
                  variant={settings.defaultColorMode === 'light' ? 'contained' : 'outlined'}
                  onClick={() => handleUpdateSettings({ defaultColorMode: 'light' })}
                >
                  Light
                </Button>
                <Button
                  size="small"
                  variant={settings.defaultColorMode === 'dark' ? 'contained' : 'outlined'}
                  onClick={() => handleUpdateSettings({ defaultColorMode: 'dark' })}
                >
                  Dark
                </Button>
              </Box>
            </Paper>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(4, 1fr)',
                },
                gap: 2,
              }}
            >
              {GLOBAL_THEME_PALETTES.map((palette, index) => {
                const isSelected = settings.activeThemeId === palette.id;
                return (
                  <Paper
                    key={palette.id}
                    elevation={0}
                    onClick={() => handleUpdateSettings({ activeThemeId: palette.id })}
                    sx={{
                      p: 2,
                      border: isSelected ? `2px solid ${palette.primary}` : '1px solid',
                      borderColor: isSelected ? palette.primary : 'divider',
                      cursor: 'pointer',
                      transition: 'transform 150ms ease, border-color 150ms ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1.5,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" className="tabular-nums">
                        {index + 1 < 10 ? `0${index + 1}` : index + 1} · {palette.category}
                      </Typography>
                      {isSelected && <CheckCircle2 size={18} color={palette.primary} />}
                    </Box>

                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                      {palette.name}
                    </Typography>

                    {/* Color Swatch Strip */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                      <Box
                        sx={{
                          flex: 2,
                          height: 28,
                          borderRadius: 1,
                          bgcolor: palette.primary,
                        }}
                      />
                      <Box
                        sx={{
                          flex: 1,
                          height: 28,
                          borderRadius: 1,
                          bgcolor: palette.secondary,
                        }}
                      />
                      <Box
                        sx={{
                          flex: 1,
                          height: 28,
                          borderRadius: 1,
                          bgcolor: palette.outgoingBubbleLight,
                          border: '1px solid rgba(0,0,0,0.1)',
                        }}
                      />
                    </Box>

                    <Typography variant="caption" className="tabular-nums" color="text.secondary">
                      Primary {palette.primary.toUpperCase()}
                    </Typography>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        )}

        {/* TAB 3: ANNOUNCEMENTS & BROADCASTS */}
        {tab === 'broadcast' && (
          <Paper
            elevation={0}
            component="form"
            onSubmit={handleTriggerBroadcast}
            sx={{ p: 3, border: 1, borderColor: 'divider', maxWidth: 680 }}
          >
            <Typography variant="h6" gutterBottom>
              Trigger Global System Announcement
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Publish a live banner at the top of every member’s screen and optionally post an
              official pinned broadcast message in the PulseChat 15 Lounge.
            </Typography>

            <TextField
              label="Announcement / Broadcast Message"
              multiline
              rows={3}
              fullWidth
              required
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              sx={{ mb: 2.5 }}
            />

            <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
              <InputLabel>Banner Severity Style</InputLabel>
              <Select
                label="Banner Severity Style"
                value={broadcastSeverity}
                onChange={(e) => setBroadcastSeverity(e.target.value as any)}
              >
                <MenuItem value="info">Information (Primary Accent)</MenuItem>
                <MenuItem value="success">Success / Milestone (Green)</MenuItem>
                <MenuItem value="warning">Important Warning (Amber)</MenuItem>
                <MenuItem value="error">Urgent Alert (Crimson)</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={postToLounge}
                  onChange={(e) => setPostToLounge(e.target.checked)}
                />
              }
              label="Also post and pin as an official message in PulseChat 15 Lounge"
              sx={{ mb: 2.5, display: 'block' }}
            />

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Send size={17} />}
              >
                Publish Announcement Now
              </Button>
              {settings.announcement?.active && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleUpdateSettings({ announcement: null })}
                >
                  Clear Active Banner
                </Button>
              )}
            </Box>
          </Paper>
        )}

        {/* TAB 4: MESSAGE MODERATION & PLATFORM CONTROLS */}
        {tab === 'moderation' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
              <Typography variant="h6" gutterBottom>
                Workspace Security & Media Restrictions
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                  gap: 2.5,
                  mt: 2,
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.readOnlyMode}
                        onChange={(e) =>
                          handleUpdateSettings({ readOnlyMode: e.target.checked })
                        }
                      />
                    }
                    label={
                      <Typography variant="subtitle2">Global Read-Only Mode</Typography>
                    }
                  />
                  <Typography variant="caption" color="text.secondary" display="block">
                    When enabled, only administrators can send messages in chats.
                  </Typography>
                </Box>

                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        color="warning"
                        checked={settings.maintenanceMode}
                        onChange={(e) =>
                          handleUpdateSettings({ maintenanceMode: e.target.checked })
                        }
                      />
                    }
                    label={
                      <Typography variant="subtitle2">Maintenance Lockdown</Typography>
                    }
                  />
                  <Typography variant="caption" color="text.secondary" display="block">
                    Displays a maintenance notice and pauses non-admin activity.
                  </Typography>
                </Box>

                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Max Media & File Upload Limit
                  </Typography>
                  <FormControl fullWidth size="small" sx={{ mt: 0.5 }}>
                    <Select
                      value={settings.maxUploadSizeMB}
                      onChange={(e) =>
                        handleUpdateSettings({
                          maxUploadSizeMB: Number(e.target.value),
                        })
                      }
                    >
                      <MenuItem value={0.5}>0.5 MB (Strict Text/Compact)</MenuItem>
                      <MenuItem value={1}>1 MB</MenuItem>
                      <MenuItem value={2}>2 MB</MenuItem>
                      <MenuItem value={5}>5 MB (Recommended)</MenuItem>
                      <MenuItem value={10}>10 MB</MenuItem>
                      <MenuItem value={25}>25 MB (High-Res Media)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </Paper>

            {/* Live Message Moderation Table */}
            <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Typography variant="h6">Live Message Moderation</Typography>
                <TextField
                  size="small"
                  placeholder="Search messages across all chats..."
                  value={modSearch}
                  onChange={(e) => setModSearch(e.target.value)}
                  sx={{ minWidth: 260 }}
                />
              </Box>

              <Divider sx={{ mb: 2 }} />

              <TableContainer sx={{ maxHeight: 380 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Sender</TableCell>
                      <TableCell>Chat</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Content</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell align="right">Moderate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMessages.map((msg) => {
                      const sender = users.find((u) => u.id === msg.senderId);
                      const chat = chats.find((c) => c.id === msg.chatId);
                      return (
                        <TableRow key={msg.id} hover>
                          <TableCell>{sender?.displayName || 'Unknown'}</TableCell>
                          <TableCell>{chat?.name || 'Direct Chat'}</TableCell>
                          <TableCell>{msg.type}</TableCell>
                          <TableCell sx={{ maxWidth: 320 }}>
                            <Typography variant="body2" noWrap>
                              {msg.content}
                            </Typography>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              color="error"
                              startIcon={<Trash2 size={14} />}
                              onClick={() => handleAdminDeleteMessage(msg.id)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        )}
      </Box>

      {/* Dialog: Add / Edit User */}
      <Dialog open={userModalOpen} onClose={() => setUserModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {editingUser ? `Edit ${editingUser.displayName}` : 'Add New Community Member'}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Display Name"
            fullWidth
            size="small"
            value={formDisplayName}
            onChange={(e) => setFormDisplayName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Username"
            fullWidth
            size="small"
            value={formUsername}
            onChange={(e) => setFormUsername(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label={editingUser ? 'New Password (leave blank to keep)' : 'Password'}
            fullWidth
            size="small"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="About / Bio"
            fullWidth
            size="small"
            value={formBio}
            onChange={(e) => setFormBio(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Role</InputLabel>
            <Select
              label="Role"
              value={formRole}
              onChange={(e) => setFormRole(e.target.value as 'member' | 'admin')}
            >
              <MenuItem value="member">Member (Counts toward 15 cap)</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveUser}>
            {editingUser ? 'Save Changes' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Ban User (Temporary or Permanent) */}
      <Dialog open={banModalOpen} onClose={() => setBanModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Ban or Suspend {banTargetUser?.displayName}</DialogTitle>
        <DialogContent dividers>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Ban Type</InputLabel>
            <Select
              label="Ban Type"
              value={banType}
              onChange={(e) => setBanType(e.target.value as 'temporary' | 'permanent')}
            >
              <MenuItem value="temporary">Temporary Suspension (Timed)</MenuItem>
              <MenuItem value="permanent">Permanent Ban</MenuItem>
            </Select>
          </FormControl>

          {banType === 'temporary' && (
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Suspension Duration</InputLabel>
              <Select
                label="Suspension Duration"
                value={banDurationMinutes}
                onChange={(e) => setBanDurationMinutes(Number(e.target.value))}
              >
                <MenuItem value={15}>15 Minutes</MenuItem>
                <MenuItem value={60}>1 Hour</MenuItem>
                <MenuItem value={1440}>24 Hours (1 Day)</MenuItem>
                <MenuItem value={10080}>7 Days (1 Week)</MenuItem>
              </Select>
            </FormControl>
          )}

          <TextField
            label="Reason Shown to User"
            fullWidth
            multiline
            rows={2}
            size="small"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBanModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmBan}>
            Confirm {banType === 'permanent' ? 'Permanent Ban' : 'Temporary Ban'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
