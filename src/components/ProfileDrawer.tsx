import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Avatar,
  TextField,
  Button,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { X, Camera, Check, Sun, Moon, LogOut } from 'lucide-react';
import { User } from '../types';

interface ProfileDrawerProps {
  open: boolean;
  user: User;
  colorMode: 'light' | 'dark';
  maxUploadSizeMB: number;
  onToggleColorMode: () => void;
  onClose: () => void;
  onUpdated: (user: User) => void;
  onLogout: () => void;
}

const WHATSAPP_BIO_PRESETS = [
  'Available',
  'Busy',
  'At work',
  'In a design sprint',
  'Urgent calls only',
  'Can’t talk, PulseChat only',
];

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  open,
  user,
  colorMode,
  maxUploadSizeMB,
  onToggleColorMode,
  onClose,
  onUpdated,
  onLogout,
}) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio);
  const [customStatus, setCustomStatus] = useState(user.customStatus || 'Available');
  const [phone, setPhone] = useState(user.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    setDisplayName(user.displayName);
    setBio(user.bio);
    setCustomStatus(user.customStatus || 'Available');
    setPhone(user.phone || '');
    setAvatarUrl(user.avatarUrl);
    setFeedback(null);
  }, [user, open]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxUploadSizeMB * 1024 * 1024) {
      setFeedback({
        type: 'error',
        text: `Profile photo exceeds maximum limit of ${maxUploadSizeMB} MB.`,
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/users/${user.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          bio,
          customStatus,
          phone,
          avatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      onUpdated(data.user);
      setFeedback({ type: 'success', text: 'Profile updated.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box
        sx={{
          width: { xs: 320, sm: 380 },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        }}
      >
        {/* WhatsApp Style Top Profile Header */}
        <Box
          sx={{
            bgcolor: 'primary.main',
            color: '#ffffff',
            px: 2.5,
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Profile & Customization
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ color: '#fff' }}>
            <X size={20} />
          </IconButton>
        </Box>

        <Box
          component="form"
          onSubmit={handleSave}
          sx={{ flex: 1, overflowY: 'auto', p: 3 }}
        >
          {feedback && (
            <Alert
              severity={feedback.type}
              sx={{ mb: 2.5 }}
              onClose={() => setFeedback(null)}
            >
              {feedback.text}
            </Alert>
          )}

          {/* Avatar Upload Section */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Box sx={{ position: 'relative', mb: 1.5 }}>
              <Avatar
                src={avatarUrl}
                alt={displayName}
                sx={{
                  width: 112,
                  height: 112,
                  border: 3,
                  borderColor: 'primary.main',
                }}
              />
              <IconButton
                component="label"
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  bgcolor: 'primary.main',
                  color: '#fff',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                <Camera size={18} />
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleAvatarUpload}
                />
              </IconButton>
            </Box>
            <Typography variant="caption" color="text.secondary">
              @{user.username} · {user.role === 'admin' ? 'Administrator' : 'Member'}
            </Typography>
          </Box>

          <TextField
            label="Your Display Name"
            fullWidth
            size="small"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            helperText="This name will be visible to all 15 community members."
            sx={{ mb: 2.5 }}
          />

          <TextField
            label="About / Bio"
            fullWidth
            multiline
            rows={2}
            size="small"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Quick Availability Status
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
            {WHATSAPP_BIO_PRESETS.map((preset) => (
              <Button
                key={preset}
                size="small"
                variant={customStatus === preset ? 'contained' : 'outlined'}
                onClick={() => setCustomStatus(preset)}
                sx={{ py: 0.4, px: 1.25, fontSize: '0.75rem' }}
              >
                {preset}
              </Button>
            ))}
          </Box>

          <TextField
            label="Phone / Contact Number (Optional)"
            fullWidth
            size="small"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={saving}
            startIcon={<Check size={18} />}
          >
            {saving ? 'Saving Changes...' : 'Save Profile Customization'}
          </Button>

          <Divider sx={{ my: 3 }} />

          {/* Personal Light / Dark Mode Override */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {colorMode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              <Typography variant="body2" fontWeight={600}>
                Personal Dark Mode
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={colorMode === 'dark'}
                  onChange={onToggleColorMode}
                  color="primary"
                />
              }
              label=""
            />
          </Box>

          <Button
            variant="outlined"
            color="error"
            fullWidth
            startIcon={<LogOut size={17} />}
            onClick={onLogout}
          >
            Sign Out of PulseChat 15
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};
