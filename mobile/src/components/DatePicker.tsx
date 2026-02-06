/**
 * DatePicker component for DropCal mobile app
 * Uses native date picker from @react-native-community/datetimepicker
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
 * DatePicker Props
 */
export interface DatePickerProps {
  /** Current date value (ISO string or Date object) */
  value: string | Date;
  /** Callback when date changes */
  onChange: (date: string) => void;
  /** Callback when focus */
  onFocus?: () => void;
  /** Callback when blur */
  onBlur?: () => void;
  /** Whether picker is editable */
  isEditing?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum date */
  minimumDate?: Date;
  /** Maximum date */
  maximumDate?: Date;
  /** Custom styles */
  style?: ViewStyle;
  /** Custom text styles */
  textStyle?: ViewStyle;
  /** Display mode for iOS */
  display?: 'default' | 'spinner' | 'calendar' | 'compact';
}

/**
 * DatePicker Component
 * Native date picker with iOS and Android support
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
  isEditing = true,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
  style,
  textStyle,
  display = 'default',
}) => {
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  // Convert value to Date object
  const dateValue = typeof value === 'string' ? new Date(value) : value;
  const isValidDate = dateValue instanceof Date && !isNaN(dateValue.getTime());

  // Format date for display
  const formatDate = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
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
      // Preserve time from original date
      const originalDate = new Date(value);
      const newDate = new Date(selectedDate);
      newDate.setHours(
        originalDate.getHours(),
        originalDate.getMinutes(),
        originalDate.getSeconds(),
        originalDate.getMilliseconds()
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

  return (
    <View style={[styles.container, style]}>
      {/* Date Display Button */}
      <TouchableOpacity
        style={[
          styles.dateButton,
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
            styles.dateText,
            {
              color: isValidDate
                ? theme.colors.textPrimary
                : theme.colors.textTertiary,
              fontSize: theme.typography.body.fontSize,
            },
            textStyle,
          ]}
        >
          {isValidDate ? formatDate(dateValue) : placeholder}
        </Text>
      </TouchableOpacity>

      {/* Native Date Picker */}
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
                mode="date"
                display={display}
                onChange={handleChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                textColor={theme.colors.textPrimary}
                accentColor={theme.colors.primary}
                style={styles.iosPicker}
              />
            </View>
          )}

          {Platform.OS === 'android' && (
            <DateTimePicker
              value={isValidDate ? dateValue : new Date()}
              mode="date"
              display={display}
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
            />
          )}
        </>
      )}
    </View>
  );
};

/**
 * Quick Date Suggestions Component
 * Shows common date options (Today, Tomorrow, Next Week, etc.)
 */
export interface DateSuggestionsProps {
  /** Current date value */
  value: string | Date;
  /** Callback when date is selected */
  onSelect: (date: string) => void;
  /** Custom styles */
  style?: ViewStyle;
}

export const DateSuggestions: React.FC<DateSuggestionsProps> = ({
  value,
  onSelect,
  style,
}) => {
  const { theme } = useTheme();

  const dateValue = typeof value === 'string' ? new Date(value) : value;
  const hours = dateValue.getHours();
  const minutes = dateValue.getMinutes();

  const generateSuggestions = () => {
    const today = new Date();
    today.setHours(hours, minutes, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return [
      { label: 'Today', date: today },
      { label: 'Tomorrow', date: tomorrow },
      { label: 'Next Week', date: nextWeek },
    ];
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
  dateButton: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
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
 * // Basic DatePicker
 * <DatePicker
 *   value={eventDate}
 *   onChange={setEventDate}
 * />
 *
 * // With Quick Suggestions
 * <View>
 *   <DatePicker
 *     value={eventDate}
 *     onChange={setEventDate}
 *     isEditing={isEditing}
 *   />
 *   <DateSuggestions
 *     value={eventDate}
 *     onSelect={setEventDate}
 *   />
 * </View>
 *
 * // With Min/Max Dates
 * <DatePicker
 *   value={eventDate}
 *   onChange={setEventDate}
 *   minimumDate={new Date()}
 *   maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
 * />
 */
