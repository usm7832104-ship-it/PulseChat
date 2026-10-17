import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Avatar,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  X,
  Image as ImageIcon,
  Type,
  Eye,
  Trash2,
  Send,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { StatusStory, User } from '../types';

interface StatusCreatorDialogProps {
  open: boolean;
  currentUser: User;
  maxUploadSizeMB: number;
  onClose: () => void;
  onCreated: () => void;
}

const STORY_BG_COLORS = [
  '#008069',
  '#0284c7',
  '#4f46e5',
  '#be123c',
  '#15803d',
  '#b45309',
  '#6d28d9',
  '#1e293b',
];

export const StatusCreatorDialog: React.FC<StatusCreatorDialogProps> = ({
  open,
  currentUser,
  maxUploadSizeMB,
  onClose,
  onCreated,
}) => {
  const [tab, setTab] = useState<'text' | 'image'>('text');
  const [content, setContent] = useState('');
  const [caption, setCaption] = useState('');
  const [bgColor, setBgColor] = useState(STORY_BG_COLORS[0]);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxUploadSizeMB * 1024 * 1024) {
      setError(`Image exceeds maximum upload limit of ${maxUploadSizeMB} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setMediaUrl(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (tab === 'text' && !content.trim()) {
      setError('Please enter status text.');
      return;
    }
    if (tab === 'image' && !mediaUrl) {
      setError('Please select an image for your status.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          type: tab,
          content: tab === 'text' ? content.trim() : caption.trim() || 'Photo Status',
          mediaUrl: tab === 'image' ? mediaUrl : undefined,
          backgroundColor: bgColor,
          textColor: '#ffffff',
          caption: caption.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post status');
      setContent('');
      setCaption('');
      setMediaUrl('');
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Post 24-Hour Status Update</Typography>
        <IconButton size="small" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            setError(null);
          }}
          sx={{ mb: 2 }}
        >
          <Tab value="text" icon={<Type size={16} />} iconPosition="start" label="Text Status" />
          <Tab
            value="image"
            icon={<ImageIcon size={16} />}
            iconPosition="start"
            label="Photo Status"
          />
        </Tabs>

        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {tab === 'text' ? (
          <Box>
            <Box
              sx={{
                bgcolor: bgColor,
                color: '#ffffff',
                borderRadius: 2,
                p: 3,
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <TextField
                placeholder="Type a status update..."
                multiline
                maxRows={5}
                fullWidth
                variant="standard"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                slotProps={{
                  input: {
                    disableUnderline: true,
                    style: {
                      color: '#ffffff',
                      fontSize: '1.35rem',
                      fontWeight: 600,
                      textAlign: 'center',
                    },
                  },
                }}
              />
            </Box>

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Background Color
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {STORY_BG_COLORS.map((color) => (
                <Box
                  key={color}
                  onClick={() => setBgColor(color)}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: color,
                    cursor: 'pointer',
                    border: bgColor === color ? '3px solid #fff' : '1px solid rgba(0,0,0,0.2)',
                    boxShadow: bgColor === color ? '0 0 0 2px #00a884' : 'none',
                  }}
                />
              ))}
            </Box>
          </Box>
        ) : (
          <Box sx={{ mb: 2 }}>
            <Button variant="outlined" component="label" fullWidth sx={{ py: 2, mb: 2 }}>
              <ImageIcon size={18} style={{ marginRight: 8 }} />
              {mediaUrl ? 'Change Status Photo' : 'Upload Photo for 24h Status'}
              <input type="file" accept="image/*" hidden onChange={handleFileChange} />
            </Button>
            {mediaUrl && (
              <Box
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  maxHeight: 260,
                  display: 'flex',
                  justifyContent: 'center',
                  bgcolor: '#000',
                  mb: 2,
                }}
              >
                <img
                  src={mediaUrl}
                  alt="Status preview"
                  referrerPolicy="no-referrer"
                  style={{ maxHeight: 260, objectFit: 'contain' }}
                />
              </Box>
            )}
          </Box>
        )}

        <TextField
          label="Optional Caption"
          size="small"
          fullWidth
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          Share for 24 Hours
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface StatusViewerModalProps {
  open: boolean;
  stories: StatusStory[];
  initialIndex: number;
  currentUser: User;
  users: User[];
  onClose: () => void;
  onReplyToStatus: (story: StatusStory, replyText: string) => void;
  onDeleted: () => void;
}

export const StatusViewerModal: React.FC<StatusViewerModalProps> = ({
  open,
  stories,
  initialIndex,
  currentUser,
  users,
  onClose,
  onReplyToStatus,
  onDeleted,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [replyText, setReplyText] = useState('');
  const [showViewersList, setShowViewersList] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setShowViewersList(false);
  }, [initialIndex, open]);

  const activeStory = stories[currentIndex];

  useEffect(() => {
    if (!open || !activeStory) return;
    // Record view on server
    fetch(`/api/statuses/${activeStory.id}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewerId: currentUser.id }),
    }).catch(() => {});
  }, [open, activeStory?.id, currentUser.id]);

  if (!open || !activeStory) return null;

  const author = users.find((u) => u.id === activeStory.userId);
  const viewerEntries = Object.entries(activeStory.viewers || {});
  const isOwnerOrAdmin =
    activeStory.userId === currentUser.id || currentUser.role === 'admin';

  const handleDelete = async () => {
    await fetch(`/api/statuses/${activeStory.id}`, { method: 'DELETE' });
    onDeleted();
    onClose();
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onReplyToStatus(activeStory, replyText.trim());
    setReplyText('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box
        sx={{
          bgcolor: activeStory.type === 'text' ? activeStory.backgroundColor : '#0b141a',
          color: '#ffffff',
          minHeight: 500,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        {/* Top Story Progress Bars & Author Bar */}
        <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.35)' }}>
          <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5 }}>
            {stories.map((st, idx) => (
              <LinearProgress
                key={st.id}
                variant="determinate"
                value={idx <= currentIndex ? 100 : 0}
                sx={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.3)',
                  '& .MuiLinearProgress-bar': { bgcolor: '#ffffff' },
                }}
              />
            ))}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar src={author?.avatarUrl} alt={author?.displayName} />
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#fff' }}>
                  {author?.displayName || 'Member'}
                </Typography>
                <Typography variant="caption" className="tabular-nums" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  {new Date(activeStory.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · Expires in 24h
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isOwnerOrAdmin && (
                <IconButton size="small" onClick={handleDelete} sx={{ color: '#fff' }}>
                  <Trash2 size={18} />
                </IconButton>
              )}
              <IconButton size="small" onClick={onClose} sx={{ color: '#fff' }}>
                <X size={20} />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Middle Story Content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {currentIndex > 0 && (
            <IconButton
              onClick={() => setCurrentIndex((i) => i - 1)}
              sx={{
                position: 'absolute',
                left: 8,
                bgcolor: 'rgba(0,0,0,0.4)',
                color: '#fff',
              }}
            >
              <ChevronLeft size={20} />
            </IconButton>
          )}

          {activeStory.type === 'image' && activeStory.mediaUrl ? (
            <Box>
              <img
                src={activeStory.mediaUrl}
                alt={activeStory.caption || 'Story'}
                referrerPolicy="no-referrer"
                style={{
                  maxHeight: 320,
                  maxWidth: '100%',
                  borderRadius: 8,
                  objectFit: 'contain',
                }}
              />
              {activeStory.caption && (
                <Typography variant="body1" sx={{ mt: 2, color: '#fff' }}>
                  {activeStory.caption}
                </Typography>
              )}
            </Box>
          ) : (
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.4, color: '#fff' }}>
                {activeStory.content}
              </Typography>
              {activeStory.caption && (
                <Typography
                  variant="body2"
                  sx={{ mt: 2, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}
                >
                  {activeStory.caption}
                </Typography>
              )}
            </Box>
          )}

          {currentIndex < stories.length - 1 && (
            <IconButton
              onClick={() => setCurrentIndex((i) => i + 1)}
              sx={{
                position: 'absolute',
                right: 8,
                bgcolor: 'rgba(0,0,0,0.4)',
                color: '#fff',
              }}
            >
              <ChevronRight size={20} />
            </IconButton>
          )}
        </Box>

        {/* Bottom Viewer Tracking or Direct Status Reply */}
        <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.45)' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: activeStory.userId !== currentUser.id ? 1.5 : 0,
            }}
          >
            <Button
              size="small"
              startIcon={<Eye size={16} />}
              onClick={() => setShowViewersList(!showViewersList)}
              sx={{ color: '#fff' }}
            >
              Viewed by {viewerEntries.length}{' '}
              {viewerEntries.length === 1 ? 'member' : 'members'}
            </Button>
          </Box>

          {showViewersList && (
            <Box
              sx={{
                bgcolor: 'background.paper',
                color: 'text.primary',
                borderRadius: 2,
                p: 1.5,
                mb: 1.5,
                maxHeight: 160,
                overflowY: 'auto',
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Status Viewers
              </Typography>
              <Divider sx={{ my: 0.5 }} />
              {viewerEntries.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                  No views yet.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {viewerEntries.map(([vId, ts]) => {
                    const viewer = users.find((u) => u.id === vId);
                    return (
                      <ListItem key={vId} disableGutters>
                        <ListItemAvatar sx={{ minWidth: 36 }}>
                          <Avatar
                            src={viewer?.avatarUrl}
                            sx={{ width: 26, height: 26 }}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={viewer?.displayName || 'Member'}
                          secondary={new Date(ts).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Box>
          )}

          {activeStory.userId !== currentUser.id && (
            <Box
              component="form"
              onSubmit={handleSendReply}
              sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
            >
              <TextField
                size="small"
                fullWidth
                placeholder={`Reply to ${author?.displayName || 'member'}'s status...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  borderRadius: 2,
                  input: { color: '#fff' },
                }}
              />
              <IconButton type="submit" sx={{ bgcolor: 'primary.main', color: '#fff' }}>
                <Send size={18} />
              </IconButton>
            </Box>
          )}
        </Box>
      </Box>
    </Dialog>
  );
};
