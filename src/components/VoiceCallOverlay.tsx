import React, { useState, useEffect } from 'react';
import {
  Dialog,
  Box,
  Typography,
  Avatar,
  IconButton,
  Button,
} from '@mui/material';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ShieldCheck,
} from 'lucide-react';
import { User } from '../types';

export interface ActiveCallSession {
  callId: string;
  callerId: string;
  receiverId: string;
  chatId?: string;
  direction: 'incoming' | 'outgoing';
  state: 'ringing' | 'connected';
}

interface VoiceCallOverlayProps {
  session: ActiveCallSession | null;
  currentUser: User;
  users: User[];
  onAccept: () => void;
  onDecline: () => void;
  onEndCall: (durationSeconds: number) => void;
}

export const VoiceCallOverlay: React.FC<VoiceCallOverlayProps> = ({
  session,
  currentUser,
  users,
  onAccept,
  onDecline,
  onEndCall,
}) => {
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [waveBars, setWaveBars] = useState<number[]>([30, 55, 80, 45, 70, 90, 40, 60, 35]);

  useEffect(() => {
    if (!session || session.state !== 'connected') {
      setSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
      setWaveBars((prev) =>
        prev.map(() => (muted ? 15 : Math.floor(25 + Math.random() * 70)))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [session, muted]);

  if (!session) return null;

  const partnerId =
    session.callerId === currentUser.id ? session.receiverId : session.callerId;
  const partner = users.find((u) => u.id === partnerId);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <Dialog open={Boolean(session)} maxWidth="xs" fullWidth>
      <Box
        sx={{
          bgcolor: '#0b141a',
          color: '#ffffff',
          p: 4,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            color: 'rgba(255,255,255,0.65)',
            mb: 3,
          }}
        >
          <ShieldCheck size={15} />
          <Typography variant="caption">
            PulseChat 15 End-to-End Voice-Only Call
          </Typography>
        </Box>

        <Avatar
          src={partner?.avatarUrl}
          alt={partner?.displayName}
          sx={{
            width: 96,
            height: 96,
            mb: 2,
            border: '3px solid #00a884',
          }}
        />

        <Typography variant="h5" fontWeight={700} gutterBottom>
          {partner?.displayName || 'Community Member'}
        </Typography>

        <Typography
          variant="body2"
          className="tabular-nums"
          sx={{ color: '#00a884', fontWeight: 600, mb: 3 }}
        >
          {session.state === 'ringing'
            ? session.direction === 'incoming'
              ? 'Incoming Voice Call...'
              : 'Calling...'
            : formatTime(seconds)}
        </Typography>

        {/* Live Voice Waveform Bars during Connected Call */}
        {session.state === 'connected' && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              height: 44,
              mb: 3,
            }}
          >
            {waveBars.map((h, i) => (
              <Box
                key={i}
                sx={{
                  width: 5,
                  height: `${h}%`,
                  bgcolor: muted ? 'rgba(255,255,255,0.25)' : '#00a884',
                  borderRadius: 1,
                  transition: 'height 180ms ease',
                }}
              />
            ))}
          </Box>
        )}

        {session.state === 'ringing' && session.direction === 'incoming' ? (
          <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
            <Button
              variant="contained"
              color="error"
              startIcon={<PhoneOff size={18} />}
              onClick={onDecline}
              sx={{ borderRadius: 6, px: 3 }}
            >
              Decline
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<Phone size={18} />}
              onClick={onAccept}
              sx={{ borderRadius: 6, px: 3 }}
            >
              Answer Voice
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mt: 1 }}>
            <IconButton
              onClick={() => setMuted(!muted)}
              sx={{
                bgcolor: muted ? 'error.main' : 'rgba(255,255,255,0.12)',
                color: '#fff',
                p: 1.75,
              }}
            >
              {muted ? <MicOff size={20} /> : <Mic size={20} />}
            </IconButton>

            <IconButton
              onClick={() => setSpeakerOn(!speakerOn)}
              sx={{
                bgcolor: speakerOn ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
                color: '#fff',
                p: 1.75,
              }}
            >
              {speakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </IconButton>

            <IconButton
              onClick={() => onEndCall(seconds)}
              sx={{
                bgcolor: 'error.main',
                color: '#fff',
                p: 2,
                '&:hover': { bgcolor: '#b91c1c' },
              }}
            >
              <PhoneOff size={22} />
            </IconButton>
          </Box>
        )}
      </Box>
    </Dialog>
  );
};
