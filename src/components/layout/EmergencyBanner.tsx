import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Clock } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { differenceInSeconds } from 'date-fns';

export function EmergencyBanner() {
  const { emergencyBanner, dismissBannerTemporary, dismissBannerPermanent, isBannerDismissed } = useAppStore();
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (emergencyBanner && !isBannerDismissed()) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [emergencyBanner]);

  useEffect(() => {
    if (!emergencyBanner?.expiresAt || !visible) return;
    const interval = setInterval(() => {
      const diff = differenceInSeconds(new Date(emergencyBanner.expiresAt!), new Date());
      if (diff <= 0) {
        setVisible(false);
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [emergencyBanner, visible]);

  const handleDismissTemp = () => {
    dismissBannerTemporary();
    setVisible(false);
  };

  const handleDismissPerm = async () => {
    await dismissBannerPermanent();
    setVisible(false);
  };

  const bgColor = emergencyBanner?.severity === 'critical'
    ? 'rgba(220, 38, 38, 0.9)'
    : emergencyBanner?.severity === 'high'
    ? 'rgba(217, 119, 6, 0.9)'
    : 'rgba(37, 99, 235, 0.9)';

  return (
    <AnimatePresence>
      {visible && emergencyBanner && (
        <motion.div
          className="emergency-slide-down"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: bgColor,
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            zIndex: 9999,
            position: 'relative',
          }}
        >
          <div className="flex items-center justify-between px-4 gap-4" style={{ padding: '16px 32px' }}>
            <div className="flex items-center gap-3 flex-1 overflow-hidden" style={{ gap: '16px' }}>
              <AlertTriangle className="shrink-0 pulse-dot" size={48} color="white" />
              <span className="text-white font-semibold truncate" style={{ fontSize: '36px', fontWeight: 700 }}>
                {emergencyBanner.message}
              </span>
              {countdown && (
                <span className="flex items-center gap-1 text-white/80 shrink-0" style={{ fontSize: '28px', gap: '8px' }}>
                  <Clock size={28} />
                  נותרו: {countdown}
                </span>
              )}
            </div>
            <div className="flex items-center shrink-0" style={{ gap: '12px' }}>
              <button
                onClick={handleDismissTemp}
                className="text-white/80 hover:text-white border border-white/30 rounded hover:bg-white/10 transition-colors"
                style={{ fontSize: '22px', padding: '6px 16px' }}
              >
                סגור ל-5 דק'
              </button>
              <button
                onClick={handleDismissPerm}
                className="text-white/80 hover:text-white border border-white/30 rounded hover:bg-white/10 transition-colors"
                style={{ fontSize: '22px', padding: '6px 16px' }}
              >
                סגור לתמיד
              </button>
              <button onClick={handleDismissTemp} className="text-white/60 hover:text-white transition-colors">
                <X size={40} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
