import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Divider,
  Tabs,
  Tab,
  Alert,
  LinearProgress,
  Avatar,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  ShieldAlert,
  Lock,
  UserCheck,
  KeyRound,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Clock,
  LogOut,
  MessageSquare,
} from 'lucide-react';
import { signInWithGooglePopup } from '../firebase';
import { User, PlatformSettings } from '../types';

interface AuthPortalProps {
  settings: PlatformSettings;
  memberCount: number;
  users: User[];
  bannedUser: User | null;
  onAuthenticated: (user: User) => void;
  onSignOutBanned: () => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  settings,
  memberCount,
  users,
  bannedUser,
  onAuthenticated,
  onSignOutBanned,
}) => {
  const [authTab, setAuthTab] = useState<'member' | 'admin'>('member');
  const [showSecondaryPasswordAuth, setShowSecondaryPasswordAuth] = useState(false);
  const [passwordMode, setPasswordMode] = useState<'login' | 'register'>('login');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('Hey there! I am using PulseChat 15.');
  const [showPassword, setShowPassword] = useState(false);

  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingBanText, setRemainingBanText] = useState<string>('');

  const isCapReached = memberCount >= settings.maxMembers;

  useEffect(() => {
    if (!bannedUser || bannedUser.banStatus !== 'temporary' || !bannedUser.banExpiresAt) {
      setRemainingBanText('');
      return;
    }
    const updateTimer = () => {
      const diffMs = new Date(bannedUser.banExpiresAt!).getTime() - Date.now();
      if (diffMs <= 0) {
        setRemainingBanText('Expired — please sign in again');
        return;
      }
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      setRemainingBanText(
        `${hours > 0 ? `${hours}h ` : ''}${mins}m ${secs < 10 ? `0${secs}` : secs}s`
      );
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [bannedUser]);

  // If the current logged-in user is banned, show the Ban Notice screen
  if (bannedUser && bannedUser.banStatus !== 'none') {
    return (
      <Box
        sx={{
          height: '100dvh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 480,
            width: '100%',
            p: 4,
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: 'error.main',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2.5,
            }}
          >
            <ShieldAlert size={32} />
          </Box>
          <Typography variant="h5" gutterBottom>
            {bannedUser.banStatus === 'permanent'
              ? 'Account Permanently Banned'
              : 'Account Temporarily Suspended'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Your access to <strong>PulseChat 15</strong> has been restricted by the platform
            administrator.
          </Typography>

          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              mb: 3,
              textAlign: 'left',
              bgcolor: 'action.hover',
              borderRadius: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary" display="block">
              Administrator Reason
            </Typography>
            <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5, mb: 1.5 }}>
              {bannedUser.banReason || 'Violation of community guidelines.'}
            </Typography>

            <Typography variant="caption" color="text.secondary" display="block">
              Restriction Status
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Clock size={16} />
              <Typography variant="body2" className="tabular-nums" fontWeight={600}>
                {bannedUser.banStatus === 'permanent'
                  ? 'Permanent Suspension'
                  : `Temporary Ban · Remaining: ${remainingBanText}`}
              </Typography>
            </Box>
          </Paper>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            startIcon={<LogOut size={18} />}
            onClick={onSignOutBanned}
          >
            Sign Out & Return to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const fbUser = await signInWithGooglePopup();
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google authentication failed.');
      }
      onAuthenticated(data.user);
    } catch (err: any) {
      const msg = err?.message || 'Could not complete Google Sign-In.';
      if (!msg.includes('auth/popup-closed-by-user')) {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: passwordMode,
          username,
          password,
          displayName,
          bio,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }
      onAuthenticated(data.user);
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickMemberLogin = async (demoUsername: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'login',
          username: demoUsername,
          password: 'password123',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Quick login failed.');
      onAuthenticated(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid admin credentials.');
      }
      onAuthenticated(data.user);
    } catch (err: any) {
      setError(err.message || 'Admin login failed.');
    } finally {
      setLoading(false);
    }
  };

  const demoMembers = users.filter((u) => u.role === 'member').slice(0, 4);

  return (
    <Box
      sx={{
        height: '100dvh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        overflowY: 'auto',
      }}
    >
      {/* Top Accent Header Band */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: '#ffffff',
          py: 3,
          px: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '100%',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <MessageSquare size={26} />
          <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
            PulseChat 15
          </Typography>
        </Box>
        <Typography variant="body2" className="tabular-nums" sx={{ opacity: 0.92 }}>
          Capacity: {memberCount} / {settings.maxMembers} Members
        </Typography>
      </Box>

      {/* Main Centered Login Card */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2, md: 4 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 500,
            width: '100%',
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={authTab}
            onChange={(_, val) => {
              setAuthTab(val);
              setError(null);
            }}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab
              value="member"
              icon={<UserCheck size={17} />}
              iconPosition="start"
              label="Member Sign-In"
            />
            <Tab
              value="admin"
              icon={<Lock size={17} />}
              iconPosition="start"
              label="Admin Portal"
            />
          </Tabs>

          <Box sx={{ p: { xs: 3, sm: 4 } }}>
            {/* 15-Member Exclusive Capacity Meter */}
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 0.75,
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Private Circle Membership Limit
                </Typography>
                <Typography
                  variant="caption"
                  className="tabular-nums"
                  fontWeight={700}
                  color={isCapReached ? 'error.main' : 'primary.main'}
                >
                  {memberCount} of {settings.maxMembers} Spots Filled
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (memberCount / settings.maxMembers) * 100)}
                color={isCapReached ? 'error' : 'primary'}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {authTab === 'member' ? (
              <Box>
                <Typography variant="h5" gutterBottom>
                  Welcome to PulseChat 15
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Real-time messaging, voice notes, 24h status stories, and voice calling for
                  our 15-member workspace.
                </Typography>

                {/* Primary Login Method: Google Sign-In */}
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  sx={{ py: 1.5, fontSize: '0.95rem', mb: 2 }}
                >
                  Continue with Google (Primary)
                </Button>

                {/* Secondary Login Method: Username & Password */}
                <Divider sx={{ my: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Secondary Sign-In Option
                  </Typography>
                </Divider>

                {!showSecondaryPasswordAuth ? (
                  <Button
                    variant="outlined"
                    color="inherit"
                    fullWidth
                    startIcon={<KeyRound size={17} />}
                    onClick={() => setShowSecondaryPasswordAuth(true)}
                  >
                    Sign in or Register with Username & Password
                  </Button>
                ) : (
                  <Box
                    component="form"
                    onSubmit={handlePasswordSubmit}
                    sx={{
                      p: 2.5,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Button
                        size="small"
                        variant={passwordMode === 'login' ? 'contained' : 'text'}
                        onClick={() => setPasswordMode('login')}
                        startIcon={<LogIn size={15} />}
                        fullWidth
                      >
                        Existing Member
                      </Button>
                      <Button
                        size="small"
                        variant={passwordMode === 'register' ? 'contained' : 'text'}
                        onClick={() => setPasswordMode('register')}
                        startIcon={<UserPlus size={15} />}
                        disabled={isCapReached}
                        fullWidth
                      >
                        New Account {isCapReached ? '(Full)' : ''}
                      </Button>
                    </Box>

                    {passwordMode === 'register' && (
                      <TextField
                        label="Full Display Name"
                        size="small"
                        fullWidth
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        sx={{ mb: 1.5 }}
                      />
                    )}

                    <TextField
                      label="Username"
                      size="small"
                      fullWidth
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      sx={{ mb: 1.5 }}
                    />

                    <TextField
                      label="Password"
                      size="small"
                      type={showPassword ? 'text' : 'password'}
                      fullWidth
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      sx={{ mb: 1.5 }}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                              >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    {passwordMode === 'register' && (
                      <TextField
                        label="WhatsApp Bio / About"
                        size="small"
                        fullWidth
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        sx={{ mb: 1.5 }}
                      />
                    )}

                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      fullWidth
                      disabled={loading}
                    >
                      {passwordMode === 'register'
                        ? 'Create Member Account'
                        : 'Sign In with Username'}
                    </Button>
                  </Box>
                )}

                {/* Quick Switch Demo Members for Multi-User Testing */}
                {demoMembers.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mb: 1 }}
                    >
                      Instant Member Switch (Test Read Receipts & Voice Calls):
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                      {demoMembers.map((m) => (
                        <Button
                          key={m.id}
                          variant="outlined"
                          size="small"
                          onClick={() => handleQuickMemberLogin(m.username)}
                          disabled={loading}
                          sx={{
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            py: 0.75,
                            px: 1.25,
                            borderColor: 'divider',
                          }}
                        >
                          <Avatar
                            src={m.avatarUrl}
                            alt={m.displayName}
                            sx={{ width: 24, height: 24, mr: 1 }}
                          />
                          <Box sx={{ overflow: 'hidden' }}>
                            <Typography
                              variant="caption"
                              fontWeight={600}
                              noWrap
                              display="block"
                              color="text.primary"
                            >
                              {m.displayName}
                            </Typography>
                          </Box>
                        </Button>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            ) : (
              /* Dedicated Admin Portal Login (admin / admin783) */
              <Box component="form" onSubmit={handleAdminSubmit}>
                <Typography variant="h5" gutterBottom>
                  Administrator Command Portal
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  Sign in with dedicated administrator credentials to manage the 15-member
                  roster, switch between 16+ global color schemes, and broadcast announcements.
                </Typography>

                <TextField
                  label="Admin Username"
                  fullWidth
                  required
                  size="small"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin"
                  sx={{ mb: 2 }}
                />

                <TextField
                  label="Admin Password"
                  fullWidth
                  required
                  size="small"
                  type={showPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="admin783"
                  sx={{ mb: 2.5 }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{ mb: 1.5 }}
                >
                  Sign In as Administrator
                </Button>

                <Button
                  variant="text"
                  size="small"
                  fullWidth
                  onClick={() => {
                    setAdminUsername('admin');
                    setAdminPassword('admin783');
                  }}
                >
                  Auto-fill Admin Credentials (admin / admin783)
                </Button>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};
