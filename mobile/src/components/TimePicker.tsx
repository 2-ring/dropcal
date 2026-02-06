/**
 * TimePicker component for DropCal mobile app
 * Uses native time picker with 15-minute intervals
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Platform,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeProvider';

/**
 * TimePicker Props
 */
export interface TimePickerProps {
  /** Current time value (ISO string or Date object) */
  value: string | Date;
  /** Callback when time changes */
  onChange: (date: string) => void;
  /** Callback when focus */
  onFocus?: () => void;
  /** Callback when blur */
  onBlur?: () => void;
  /** Whether picker is editable */
  isEditing?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Start time for calculating duration (if this is an end time picker) */
  startTime?: string | Date;
  /** Time interval in minutes (default: 15) */
  minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
  /** Custom styles */
  style?: ViewStyle;
  /** Custom text styles */
  textStyle?: ViewStyle;
  /** Display mode for iOS */
  display?: 'default' | 'spinner' | 'compact';
}

/**
 * TimePicker Component
 * Native time picker with iOS and Android support, 15-minute intervals
 */
export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
  isEditing = true,
  placeholder = 'Select time',
  startTime,
  minuteInterval = 15,
  style,
  textStyle,
  display = 'spinner',
}) => {
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  // Convert value to Date object
  const dateValue = typeof value === 'string' ? new Date(value) : value;
  const isValidDate = dateValue instanceof Date && !isNaN(dateValue.getTime());

  // Format time for display
  const formatTime = (date: Date): string => {
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // If there's a start time, show duration
    if (startTime) {
      const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
      const durationMinutes = Math.round((date.getTime() - start.getTime()) / (1000 * 60));

      if (durationMinutes < 0) {
        return timeStr;
      }

      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;

      if (hours === 0 && minutes === 0) {
        return `${timeStr} (0 mins)`;
      } else if (hours === 0) {
        return `${timeStr} (${minutes} mins)`;
      } else if (minutes === 0) {
        return `${timeStr} (${hours} hr${hours > 1 ? 's' : ''})`;
      } else {
        return `${timeStr} (${hours}.${minutes === 30 ? '5' : '0'} hrs)`;
      }
    }

    return timeStr;
  };

  const handlePress = () => {
    if (!isEditing) return;
    onFocus?.();
    setShowPicker(true);
  };

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // On Android, dismiss picker when user cancels
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      // Round to nearest interval
      const roundedDate = roundToInterval(selectedDate, minuteInterval);

      // Preserve date from original value, only update time
      const originalDate = new Date(value);
      const newDate = new Date(originalDate);
      newDate.setHours(
        roundedDate.getHours(),
        roundedDate.getMinutes(),
        0,
        0
      );

      onChange(newDate.toISOString());
      onBlur?.();

      // On iOS, keep picker open; on Android it auto-closes
      if (Platform.OS === 'android') {
        setShowPicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowPicker(false);
      onBlur?.();
    }
  };

  const handleDismiss = () => {
    setShowPicker(false);
    onBlur?.();
  };

  // Round time to nearest interval
  const roundToInterval = (date: Date, interval: number): Date => {
    const rounded = new Date(date);
    const minutes = rounded.getMinutes();
    const roundedMinutes = Math.round(minutes / interval) * interval;
    rounded.setMinutes(roundedMinutes);
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);
    return rounded;
  };

  return (
    <View style={[styles.container, style]}>
      {/* Time Display Button */}
      <TouchableOpacity
        style={[
          styles.timeButton,
          {
            backgroundColor: isEditing
              ? theme.colors.background
              : theme.colors.backgroundSecondary,
            borderColor: theme.colors.border,
          },
        ]}
        onPress={handlePress}
        disabled={!isEditing}
      >
        <Text
          style={[
            styles.timeText,
            {
              color: isValidDate
                ? theme.colors.textPrimary
                : theme.colors.textTertiary,
              fontSize: theme.typography.body.fontSize,
            },
            textStyle,
          ]}
        >
          {isValidDate ? formatTime(dateValue) : placeholder}
        </Text>
      </TouchableOpacity>

      {/* Native Time Picker */}
      {showPicker && (
        <>
          {Platform.OS === 'ios' && (
            <View
              style={[
                styles.iosPickerContainer,
                { backgroundColor: theme.colors.backgroundElevated },
              ]}
            >
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity onPress={handleDismiss}>
                  <Text
                    style={[
                      styles.iosPickerButton,
                      { color: theme.colors.primary },
                    ]}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={isValidDate ? dateValue : new Date()}
                mode="time"
                display={display}
                onChange={handleChange}
                minuteInterval={minuteInterval}
                textColor={theme.colors.textPrimary}
                accentColor={theme.colors.primary}
                style={styles.iosPicker}
              />
            </View>
          )}

          {Platform.OS === 'android' && (
            <DateTimePicker
              value={isValidDate ? dateValue : new Date()}
              mode="time"
              display="default"
              onChange={handleChange}
              minuteInterval={minuteInterval}
              is24Hour={false}
            />
          )}
        </>
      )}
    </View>
  );
};

/**
 * Quick Time Suggestions Component
 * Shows common time options based on current time
 */
export interface TimeSuggestionsProps {
  /** Current time value */
  value: string | Date;
  /** Callback when time is selected */
  onSelect: (time: string) => void;
  /** Start time (if this is for end time) */
  startTime?: string | Date;
  /** Custom styles */
  style?: ViewStyle;
}

export const TimeSuggestions: React.FC<TimeSuggestionsProps> = ({
  value,
  onSelect,
  startTime,
  style,
}) => {
  const { theme } = useTheme();

  const dateValue = typeof value === 'string' ? new Date(value) : value;

  const generateSuggestions = () => {
    if (startTime) {
      // For end time: show +15m, +30m, +1h, +2h from start
      const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
      return [
        {
          label: '+15m',
          date: new Date(start.getTime() + 15 * 60 * 1000),
        },
        {
          label: '+30m',
          date: new Date(start.getTime() + 30 * 60 * 1000),
        },
        {
          label: '+1h',
          date: new Date(start.getTime() + 60 * 60 * 1000),
        },
        {
          label: '+2h',
          date: new Date(start.getTime() + 120 * 60 * 1000),
        },
      ];
    } else {
      // For start time: show common times
      const now = new Date();
      const baseDate = new Date(dateValue);
      baseDate.setHours(0, 0, 0, 0);

      const createTime = (hours: number, minutes: number = 0) => {
        const time = new Date(baseDate);
        time.setHours(hours, minutes, 0, 0);
        return time;
      };

      return [
        { label: '9:00 AM', date: createTime(9, 0) },
        { label: '12:00 PM', date: createTime(12, 0) },
        { label: '3:00 PM', date: createTime(15, 0) },
        { label: '6:00 PM', date: createTime(18, 0) },
      ];
    }
  };

  const suggestions = generateSuggestions();

  return (
    <View style={[styles.suggestionsContainer, style]}>
      {suggestions.map((suggestion, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.suggestionButton,
            {
              backgroundColor: theme.colors.backgroundSecondary,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => onSelect(suggestion.date.toISOString())}
        >
          <Text
            style={[
              styles.suggestionText,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.body.fontSize,
              },
            ]}
          >
            {suggestion.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  timeButton: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontWeight: '500',
  },
  iosPickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34, // Safe area bottom
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  iosPickerButton: {
    fontSize: 17,
    fontWeight: '600',
  },
  iosPicker: {
    height: 200,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  suggestionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  suggestionText: {
    fontWeight: '500',
  },
});

/**
 * Usage Examples:
 *
 * // Basic TimePicker
 * <TimePicker
 *   value={eventTime}
 *   onChange={setEventTime}
 * />
 *
 * // End Time with Duration Display
 * <TimePicker
 *   value={endTime}
 *   onChange={setEndTime}
 *   startTime={startTime}
 *   isEditing={isEditing}
 * />
 *
 * // With Quick Suggestions
 * <View>
 *   <TimePicker
 *     value={eventTime}
 *     onChange={setEventTime}
 *   />
 *   <TimeSuggestions
 *     value={eventTime}
 *     onSelect={setEventTime}
 *   />
 * </View>
 *
 * // With Custom Interval
 * <TimePicker
 *   value={eventTime}
 *   onChange={setEventTime}
 *   minuteInterval={30}
 * />
 */
