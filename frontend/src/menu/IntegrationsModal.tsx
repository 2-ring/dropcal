/**
 * Modal for managing calendar integrations.
 * Shows connected calendars and allows selecting a default calendar.
 */

import { X, Check, GoogleLogo, MicrosoftOutlookLogo } from '@phosphor-icons/react';
import { useState } from 'react';
import './IntegrationsModal.css';

interface Calendar {
  id: string;
  name: string;
  email: string;
  provider: 'google' | 'microsoft' | 'apple';
  isDefault: boolean;
  isConnected: boolean;
}

interface IntegrationsModalProps {
  onClose: () => void;
}

export function IntegrationsModal({ onClose }: IntegrationsModalProps) {
  // Mock data - will be replaced with actual backend data
  const [calendars, setCalendars] = useState<Calendar[]>([
    {
      id: '1',
      name: 'Personal Calendar',
      email: 'user@gmail.com',
      provider: 'google',
      isDefault: true,
      isConnected: true,
    },
    {
      id: '2',
      name: 'Work Calendar',
      email: 'user@company.com',
      provider: 'microsoft',
      isDefault: false,
      isConnected: true,
    },
  ]);

  const handleSetDefault = (calendarId: string) => {
    setCalendars((prev) =>
      prev.map((cal) => ({
        ...cal,
        isDefault: cal.id === calendarId,
      }))
    );
  };

  const handleDisconnect = (calendarId: string) => {
    // TODO: Implement disconnect logic
    console.log('Disconnect calendar:', calendarId);
  };

  const handleConnectNew = (provider: 'google' | 'microsoft' | 'apple') => {
    // TODO: Implement OAuth flow
    console.log('Connect new calendar:', provider);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return <GoogleLogo size={20} weight="regular" />;
      case 'microsoft':
        return <MicrosoftOutlookLogo size={20} weight="regular" />;
      case 'apple':
        return <span className="apple-icon">􀣺</span>;
      default:
        return null;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'google':
        return 'Google Calendar';
      case 'microsoft':
        return 'Microsoft Outlook';
      case 'apple':
        return 'Apple Calendar';
      default:
        return provider;
    }
  };

  // Close modal when clicking backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="integrations-modal-backdrop" onClick={handleBackdropClick}>
      <div className="integrations-modal">
        {/* Header */}
        <div className="integrations-modal-header">
          <h2>Manage Integrations</h2>
          <button className="integrations-modal-close" onClick={onClose}>
            <X size={20} weight="regular" />
          </button>
        </div>

        {/* Connected Calendars */}
        <div className="integrations-modal-content">
          <div className="integrations-section">
            <h3>Connected Calendars</h3>
            <p className="integrations-section-description">
              Select your default calendar for new events
            </p>

            <div className="integrations-calendar-list">
              {calendars.map((calendar) => (
                <div
                  key={calendar.id}
                  className={`integrations-calendar-item ${
                    calendar.isDefault ? 'integrations-calendar-default' : ''
                  }`}
                >
                  <div className="integrations-calendar-info">
                    <div className="integrations-calendar-icon">
                      {getProviderIcon(calendar.provider)}
                    </div>
                    <div className="integrations-calendar-details">
                      <div className="integrations-calendar-name">
                        {calendar.name}
                        {calendar.isDefault && (
                          <span className="integrations-default-badge">Default</span>
                        )}
                      </div>
                      <div className="integrations-calendar-email">{calendar.email}</div>
                      <div className="integrations-calendar-provider">
                        {getProviderName(calendar.provider)}
                      </div>
                    </div>
                  </div>

                  <div className="integrations-calendar-actions">
                    {!calendar.isDefault && (
                      <button
                        className="integrations-calendar-button integrations-set-default"
                        onClick={() => handleSetDefault(calendar.id)}
                      >
                        <Check size={16} weight="regular" />
                        Set as default
                      </button>
                    )}
                    <button
                      className="integrations-calendar-button integrations-disconnect"
                      onClick={() => handleDisconnect(calendar.id)}
                      disabled={calendar.isDefault}
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Calendar */}
          <div className="integrations-section">
            <h3>Connect New Calendar</h3>
            <div className="integrations-provider-list">
              <button
                className="integrations-provider-button"
                onClick={() => handleConnectNew('google')}
              >
                <GoogleLogo size={24} weight="regular" />
                <span>Google Calendar</span>
              </button>
              <button
                className="integrations-provider-button"
                onClick={() => handleConnectNew('microsoft')}
              >
                <MicrosoftOutlookLogo size={24} weight="regular" />
                <span>Microsoft Outlook</span>
              </button>
              <button
                className="integrations-provider-button"
                onClick={() => handleConnectNew('apple')}
              >
                <span className="apple-icon" style={{ fontSize: 24 }}>􀣺</span>
                <span>Apple Calendar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
