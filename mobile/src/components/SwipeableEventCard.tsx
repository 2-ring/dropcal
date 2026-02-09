import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Icon } from './Icon';
import type { CalendarEvent } from './EventCard';

interface SwipeableEventCardProps {
  event: CalendarEvent | null;
  index: number;
  isLoading?: boolean;
  calendars?: Array<{ id: string; summary: string; backgroundColor: string }>;
  formatTimeRange: (start: string, end: string) => string;
  getCalendarColor: (calendarName: string | undefined) => string;
  onClick?: () => void;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
}

export function SwipeableEventCard({
  event,
  index,
  isLoading = false,
  calendars = [],
  formatTimeRange,
  getCalendarColor,
  onClick,
  onSwipeRight,
  onSwipeLeft,
}: SwipeableEventCardProps) {
  const swipeableRef = useRef<Swipeable>(null);

  // Left actions = revealed when swiping right (add to calendar)
  const renderLeftActions = useCallback(
    (progress: Animated.AnimatedInterpolation<number>) => {
      const scale = progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.5, 0.8, 1],
        extrapolate: 'clamp',
      });
      const opacity = progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.5, 1],
        extrapolate: 'clamp',
      });
      return (
        <Animated.View style={[styles.actionRight, { opacity }]}>
          <Animated.View style={[styles.actionContentRight, { transform: [{ scale }] }]}>
            <Icon name="CalendarStar" size={28} color="#ffffff" weight="duotone" />
            <Text style={styles.actionText}>Add</Text>
          </Animated.View>
        </Animated.View>
      );
    },
    []
  );

  // Right actions = revealed when swiping left (delete)
  const renderRightActions = useCallback(
    (progress: Animated.AnimatedInterpolation<number>) => {
      const scale = progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.5, 0.8, 1],
        extrapolate: 'clamp',
      });
      const opacity = progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.5, 1],
        extrapolate: 'clamp',
      });
      return (
        <Animated.View style={[styles.actionLeft, { opacity }]}>
          <Animated.View style={[styles.actionContentLeft, { transform: [{ scale }] }]}>
            <Icon name="X" size={28} color="#ffffff" weight="bold" />
            <Text style={styles.actionText}>Remove</Text>
          </Animated.View>
        </Animated.View>
      );
    },
    []
  );

  const handleSwipeOpen = useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'right') {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
      // Close after action
      swipeableRef.current?.close();
    },
    [onSwipeRight, onSwipeLeft]
  );

  // Loading skeleton
  if (isLoading && !event) {
    return (
      <View style={styles.skeletonCard}>
        <View style={styles.skeletonContent} />
      </View>
    );
  }

  if (!event) return null;

  const calendarColor = getCalendarColor(event.calendar);
  const calendarName =
    calendars.find(
      (cal) =>
        cal.id === event.calendar ||
        cal.summary.toLowerCase() === event.calendar?.toLowerCase()
    )?.summary ||
    event.calendar ||
    'Primary';

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableOpen={handleSwipeOpen}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
    >
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { borderLeftColor: calendarColor, borderLeftWidth: 8 },
          pressed && styles.cardPressed,
        ]}
        onPress={onClick}
      >
        <View style={styles.row}>
          <Text style={styles.title}>
            {event.summary}{' '}
            <Text style={styles.timeInline}>
              ({formatTimeRange(event.start.dateTime, event.end.dateTime)})
            </Text>
          </Text>
        </View>

        {event.location && (
          <View style={styles.row}>
            <View style={styles.meta}>
              <Icon name="MapPin" size={16} color="#6B7280" />
              <Text style={styles.metaText}>{event.location}</Text>
            </View>
          </View>
        )}

        {event.description && (
          <View style={styles.row}>
            <View style={styles.meta}>
              <Icon name="Equals" size={16} color="#6B7280" />
              <Text style={styles.metaText}>{event.description}</Text>
            </View>
          </View>
        )}

        <View style={styles.row}>
          <View style={styles.calendarBadge}>
            <View
              style={[styles.calendarDot, { backgroundColor: calendarColor }]}
            />
            <Text style={styles.calendarText}>{calendarName}</Text>
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionRight: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    justifyContent: 'center',
    width: 120,
    marginBottom: 12,
  },
  actionContentRight: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 4,
  },
  actionLeft: {
    backgroundColor: '#EF4444',
    borderRadius: 16,
    justifyContent: 'center',
    width: 120,
    marginBottom: 12,
  },
  actionContentLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 4,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  cardPressed: {
    transform: [{ translateY: -2 }],
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 25,
    flex: 1,
  },
  timeInline: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginLeft: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
    flex: 1,
  },
  calendarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  calendarText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  skeletonCard: {
    minHeight: 140,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonContent: {
    padding: 24,
  },
});
