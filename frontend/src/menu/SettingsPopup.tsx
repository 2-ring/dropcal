/**
 * Settings popup component that appears when clicking the account button.
 * Shows user info and menu options.
 */

import {
  Calendar,
  CrownSimple,
  SignOut,
  MoonStars,
  Sun,
  GlobeSimple,
  FootballHelmet,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { IntegrationsModal } from './IntegrationsModal';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import './SettingsPopup.css';
import { useState } from 'react';

interface SettingsPopupProps {
  onClose: () => void;
  userEmail: string;
  userName: string;
  userAvatar?: string;
  isLoading?: boolean;
}

export function SettingsPopup({ onClose, userEmail, userName, userAvatar, isLoading = false }: SettingsPopupProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // Settings state (will be persisted to backend/localStorage in future)
  const [useInternationalDate, setUseInternationalDate] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showIntegrationsModal, setShowIntegrationsModal] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      onClose();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const handleUpgradePlan = () => {
    navigate('/plans');
    onClose();
  };

  const handleManageIntegrations = () => {
    setShowIntegrationsModal(true);
  };

  // Close popup when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div className="settings-popup-backdrop" onClick={handleBackdropClick}>
        <div className="settings-popup">
        {/* User header */}
        <div className="settings-popup-header">
          {isLoading ? (
            <>
              <div className="settings-popup-user">
                <Skeleton circle width={48} height={48} />
                <div className="settings-popup-user-info">
                  <Skeleton width={120} height={18} style={{ marginBottom: 4 }} />
                  <Skeleton width={60} height={14} />
                </div>
              </div>
              <Skeleton width={180} height={14} />
            </>
          ) : (
            <>
              <div className="settings-popup-user">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="settings-popup-avatar" referrerPolicy="no-referrer" />
                ) : (
                  <div className="settings-popup-avatar-placeholder">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="settings-popup-user-info">
                  <span className="settings-popup-user-name">{userName}</span>
                  <span className="settings-popup-user-plan">Pro plan</span>
                </div>
              </div>
              <div className="settings-popup-email">{userEmail}</div>
            </>
          )}
        </div>

        {/* Menu items */}
        <div className="settings-popup-menu">
          {isLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="settings-popup-item" style={{ padding: '12px 16px' }}>
                  <Skeleton width={20} height={20} style={{ marginRight: 12 }} />
                  <Skeleton width={100 + i * 10} height={16} />
                </div>
              ))}
            </>
          ) : (
            <>
          <button className="settings-popup-item" onClick={handleUpgradePlan}>
            <CrownSimple size={20} weight="regular" />
            <span>Upgrade plan</span>
          </button>

          <button
            className="settings-popup-item"
            onClick={() => setUseInternationalDate(!useInternationalDate)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={useInternationalDate ? 'intl-icon' : 'usa-icon'}
                initial={{ y: 20, scale: 0.95, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: -20, scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {useInternationalDate ? (
                  <GlobeSimple size={20} weight="regular" />
                ) : (
                  <FootballHelmet size={20} weight="regular" />
                )}
              </motion.div>
            </AnimatePresence>
            <span>Date format</span>
            <div className="settings-popup-value">
              <AnimatePresence mode="wait">
                <motion.span
                  key={useInternationalDate ? 'intl' : 'usa'}
                  initial={{ y: 20, scale: 0.95, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  exit={{ y: -20, scale: 0.95, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  {useInternationalDate ? 'DD/MM/YYYY' : 'MM/DD/YYYY'}
                </motion.span>
              </AnimatePresence>
            </div>
          </button>

          <button
            className="settings-popup-item"
            onClick={() => setDarkMode(!darkMode)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={darkMode ? 'dark' : 'light'}
                initial={{ y: 20, scale: 0.95, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: -20, scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                {darkMode ? (
                  <MoonStars size={20} weight="regular" />
                ) : (
                  <Sun size={20} weight="regular" />
                )}
                <span>{darkMode ? 'Dark mode' : 'Light mode'}</span>
              </motion.div>
            </AnimatePresence>
          </button>

          <button className="settings-popup-item" onClick={handleManageIntegrations}>
            <Calendar size={20} weight="regular" />
            <span>Manage integrations</span>
          </button>
            </>
          )}
        </div>

        {/* Logout */}
        <div className="settings-popup-footer">
          {isLoading ? (
            <div className="settings-popup-item" style={{ padding: '12px 16px' }}>
              <Skeleton width={20} height={20} style={{ marginRight: 12 }} />
              <Skeleton width={60} height={16} />
            </div>
          ) : (
            <button className="settings-popup-item settings-popup-logout" onClick={handleLogout}>
              <SignOut size={20} weight="regular" />
              <span>Log out</span>
            </button>
          )}
        </div>
      </div>
    </div>

      {/* Integrations Modal */}
      {showIntegrationsModal && (
        <IntegrationsModal onClose={() => setShowIntegrationsModal(false)} />
      )}
    </>
  );
}
