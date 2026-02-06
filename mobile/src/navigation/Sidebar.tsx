import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Modal,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';

interface Session {
  id: string;
  title: string;
  timestamp: Date;
  inputType: 'text' | 'image' | 'audio' | 'document';
  status: 'active' | 'completed' | 'error';
  eventCount: number;
}

interface SidebarProps {
  /** Whether the sidebar is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Session click handler */
  onSessionClick?: (sessionId: string) => void;
  /** Settings handler */
  onSettings?: () => void;
  /** Sign out handler */
  onSignOut?: () => void;
  /** Current session ID */
  currentSessionId?: string;
  /** Sessions list */
  sessions?: Session[];
}

/**
 * Sidebar Navigation - 1:1 Web Conversion
 * 280px wide sliding sidebar from left
 */
export function Sidebar({
  isOpen,
  onClose,
  onSessionClick,
  onSettings,
  onSignOut,
  currentSessionId,
  sessions = [],
}: SidebarProps) {
  const { theme, themeMode, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [slideAnim] = useState(new Animated.Value(isOpen ? 0 : -280));

  // Animate sidebar open/close
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : -280,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  // Group sessions by time period
  const groupSessionsByTime = (sessions: Session[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const grouped: Record<string, Session[]> = {
      today: [],
      yesterday: [],
      'this week': [],
      'this month': [],
      older: [],
    };

    sessions.forEach((session) => {
      const sessionDate = session.timestamp;

      if (sessionDate >= today) {
        grouped.today.push(session);
      } else if (sessionDate >= yesterday) {
        grouped.yesterday.push(session);
      } else if (sessionDate >= lastWeek) {
        grouped['this week'].push(session);
      } else if (sessionDate >= lastMonth) {
        grouped['this month'].push(session);
      } else {
        grouped.older.push(session);
      }
    });

    return grouped;
  };

  const groupedSessions = groupSessionsByTime(sessions);

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable
        style={[styles.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
        onPress={onClose}
      />

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            backgroundColor: theme.colors.backgroundSecondary || theme.colors.background,
            borderRightColor: theme.colors.border,
            transform: [{ translateX: slideAnim }],
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.logoContainer}>
            <Logo size={26} />
            {/* Word logo would go here */}
          </View>

          <Pressable
            style={styles.toggleButton}
            onPress={onClose}
          >
            <Icon
              name="CaretLeft"
              size={18}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Session List */}
        <ScrollView
          style={styles.sessionList}
          contentContainerStyle={styles.sessionListContent}
          showsVerticalScrollIndicator={false}
        >
          {Object.entries(groupedSessions).map(([period, periodSessions]) => {
            if (periodSessions.length === 0) return null;

            return (
              <View key={period} style={styles.sessionGroup}>
                <Text style={[styles.groupLabel, { color: theme.colors.textTertiary }]}>
                  {period}
                </Text>

                {periodSessions.map((session) => (
                  <Pressable
                    key={session.id}
                    style={({ pressed }) => [
                      styles.sessionEntry,
                      {
                        backgroundColor:
                          session.id === currentSessionId
                            ? theme.colors.backgroundHover
                            : pressed
                            ? theme.colors.backgroundHover
                            : 'transparent',
                      },
                    ]}
                    onPress={() => onSessionClick?.(session.id)}
                  >
                    <Icon
                      name="ChatCircle"
                      size={16}
                      color={
                        session.id === currentSessionId
                          ? theme.colors.textPrimary
                          : theme.colors.textSecondary
                      }
                      style={styles.sessionIcon}
                    />
                    <Text
                      style={[
                        styles.sessionTitle,
                        { color: theme.colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {session.title}
                    </Text>
                    {session.eventCount > 0 && (
                      <View
                        style={[
                          styles.eventBadge,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      >
                        <Text style={[styles.eventBadgeText, { color: '#ffffff' }]}>
                          {session.eventCount}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            );
          })}

          {sessions.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
                No sessions yet
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          {/* Theme Toggle */}
          <Pressable
            style={({ pressed }) => [
              styles.footerButton,
              {
                backgroundColor: pressed
                  ? theme.colors.backgroundHover
                  : 'transparent',
              },
            ]}
            onPress={toggleTheme}
          >
            <Icon
              name={themeMode === 'dark' ? 'Moon' : 'Sun'}
              size={18}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.footerButtonText, { color: theme.colors.textPrimary }]}>
              {themeMode === 'dark' ? 'Dark' : 'Light'} Mode
            </Text>
          </Pressable>

          {/* Settings */}
          <Pressable
            style={({ pressed }) => [
              styles.footerButton,
              {
                backgroundColor: pressed
                  ? theme.colors.backgroundHover
                  : 'transparent',
              },
            ]}
            onPress={onSettings}
          >
            <Icon
              name="Settings"
              size={18}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.footerButtonText, { color: theme.colors.textPrimary }]}>
              Settings
            </Text>
          </Pressable>

          {/* Sign Out */}
          <Pressable
            style={({ pressed }) => [
              styles.footerButton,
              {
                backgroundColor: pressed
                  ? theme.colors.backgroundHover
                  : 'transparent',
              },
            ]}
            onPress={onSignOut}
          >
            <Icon
              name="SignOut"
              size={18}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.footerButtonText, { color: theme.colors.textPrimary }]}>
              Sign Out
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    borderRightWidth: 1,
    flexDirection: 'column',
    zIndex: 1000,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
    borderBottomWidth: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 34, // Account for logo mark position
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Session List
  sessionList: {
    flex: 1,
  },
  sessionListContent: {
    padding: 12,
  },
  sessionGroup: {
    marginBottom: 12,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    paddingHorizontal: 10,
  },
  sessionEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 2,
    gap: 8,
  },
  sessionIcon: {
    flexShrink: 0,
  },
  sessionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
  },
  eventBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Footer
  footer: {
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 12,
    marginBottom: 2,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
