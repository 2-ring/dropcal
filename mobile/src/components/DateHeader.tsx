import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon, PhosphorIconName } from './Icon';

interface DateHeaderProps {
  /** The date to display */
  date: Date;
}

interface MonthHeaderProps {
  /** The date to display (month will be extracted) */
  date: Date;
}

/**
 * Month header component showing month name with seasonal icon
 * Used to separate events by month in the events list
 */
export function MonthHeader({ date }: MonthHeaderProps) {
  // Format as "February 2026" or just "February" if current year
  const currentYear = new Date().getFullYear();
  const eventYear = date.getFullYear();
  const includeYear = eventYear !== currentYear;

  const monthYear = date.toLocaleDateString('en-US', {
    month: 'long',
    ...(includeYear && { year: 'numeric' }),
  });

  // Get month icon based on month number (0-11)
  const getMonthIcon = (month: number): PhosphorIconName => {
    const icons: PhosphorIconName[] = [
      'Snowflake', // January
      'Heart', // February
      'Plant', // March
      'FlowerTulip', // April
      'Flower', // May
      'Sun', // June
      'Sparkle', // July
      'Waves', // August
      'Leaf', // September
      'Ghost', // October
      'Coffee', // November
      'Tree', // December
    ];
    return icons[month];
  };

  return (
    <View style={styles.monthHeader}>
      <View style={styles.monthHeaderContent}>
        <Icon name={getMonthIcon(date.getMonth())} size={16} color="#6B7280" />
        <Text style={styles.monthHeaderText}>{monthYear}</Text>
      </View>
    </View>
  );
}

/**
 * Date header component showing day of week and date number in circular design
 * Used to group events by date in the events list
 */
export function DateHeader({ date }: DateHeaderProps) {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  // Get day of week (short format: Mon, Tue, Wed, etc.)
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });

  // Get date number (1-31)
  const dateNumber = date.getDate();

  return (
    <View style={[styles.dateHeader, isToday && styles.dateHeaderToday]}>
      {/* Day of week label */}
      <Text
        style={[
          styles.dayLabel,
          isToday && styles.dayLabelToday,
        ]}
      >
        {dayOfWeek.toUpperCase()}
      </Text>

      {/* Large circular date number */}
      <View
        style={[
          styles.dateCircle,
          isToday && styles.dateCircleToday,
        ]}
      >
        <Text
          style={[
            styles.dateNumber,
            isToday && styles.dateNumberToday,
          ]}
        >
          {dateNumber}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Month Header Styles
  monthHeader: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  monthHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  monthHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Date Header Styles
  dateHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0,
    width: 36,
  },
  dateHeaderToday: {
    gap: 0.5,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.6,
    textAlign: 'center',
    width: '100%',
  },
  dayLabelToday: {
    color: '#1170C5',
  },
  dateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
    marginTop: -8,
  },
  dateCircleToday: {
    backgroundColor: '#1170C5',
    borderColor: '#1170C5',
    marginTop: 0,
  },
  dateNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 20,
  },
  dateNumberToday: {
    color: '#ffffff',
  },
});
