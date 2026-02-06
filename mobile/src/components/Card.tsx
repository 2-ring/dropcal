/**
 * Card component for DropCal mobile app
 * Base card component with shadows, borders, and theme support
 */

import React, { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Card Props
 */
export interface CardProps {
  /** Card content */
  children: ReactNode;
  /** Callback when card is pressed (makes card touchable) */
  onPress?: () => void;
  /** Card variant */
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
  /** Custom padding */
  padding?: number;
  /** Custom margin */
  margin?: number;
  /** Custom border radius */
  borderRadius?: number;
  /** Whether to show shadow */
  shadow?: boolean;
  /** Custom styles */
  style?: ViewStyle;
  /** Content container styles */
  contentStyle?: ViewStyle;
  /** Whether card is disabled (when pressable) */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Card Component
 * Flexible card component with multiple variants and touch support
 */
export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  variant = 'default',
  padding = 16,
  margin,
  borderRadius = 12,
  shadow = true,
  style,
  contentStyle,
  disabled = false,
  testID,
}) => {
  const { theme } = useTheme();

  // Determine card styles based on variant
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: theme.colors.backgroundElevated || theme.colors.background,
          borderWidth: 0,
          ...getShadowStyles('medium'),
        };
      case 'outlined':
        return {
          backgroundColor: theme.colors.background,
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      case 'flat':
        return {
          backgroundColor: theme.colors.backgroundSecondary,
          borderWidth: 0,
        };
      case 'default':
      default:
        return {
          backgroundColor: theme.colors.background,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...(shadow && getShadowStyles('light')),
        };
    }
  };

  // Shadow styles helper
  const getShadowStyles = (intensity: 'light' | 'medium' | 'heavy'): ViewStyle => {
    const shadowConfig = {
      light: {
        shadowColor: theme.colors.shadowLight || '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
      },
      medium: {
        shadowColor: theme.colors.shadowMedium || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
      },
      heavy: {
        shadowColor: theme.colors.shadowHeavy || '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
      },
    };

    return shadowConfig[intensity];
  };

  const baseStyles: ViewStyle = {
    borderRadius,
    padding,
    ...(margin && { margin }),
    ...getVariantStyles(),
  };

  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress
    ? {
        onPress,
        disabled,
        activeOpacity: 0.7,
        testID,
      }
    : { testID };

  return (
    <Wrapper {...wrapperProps} style={[baseStyles, style]}>
      <View style={contentStyle}>{children}</View>
    </Wrapper>
  );
};

/**
 * Card Header Props
 */
export interface CardHeaderProps {
  /** Header title */
  title: string | ReactNode;
  /** Optional subtitle */
  subtitle?: string | ReactNode;
  /** Optional right action (e.g., icon button) */
  action?: ReactNode;
  /** Custom styles */
  style?: ViewStyle;
}

/**
 * CardHeader Component
 * Pre-styled header for cards
 */
export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  style,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.cardHeader, style]}>
      <View style={styles.cardHeaderText}>
        {typeof title === 'string' ? (
          <Text style={{ fontSize: theme.typography.h3.fontSize, fontWeight: theme.typography.h3.fontWeight, color: theme.colors.textPrimary }}>
            {title}
          </Text>
        ) : (
          title
        )}
        {subtitle && (
          <View style={{ marginTop: 4 }}>
            {typeof subtitle === 'string' ? (
              <Text
                style={{
                  fontSize: theme.typography.caption.fontSize,
                  color: theme.colors.textSecondary,
                }}
              >
                {subtitle}
              </Text>
            ) : (
              subtitle
            )}
          </View>
        )}
      </View>
      {action && <View style={styles.cardHeaderAction}>{action}</View>}
    </View>
  );
};

/**
 * Card Section Props
 */
export interface CardSectionProps {
  /** Section content */
  children: ReactNode;
  /** Whether to show divider above section */
  divider?: boolean;
  /** Custom padding */
  padding?: number;
  /** Custom styles */
  style?: ViewStyle;
}

/**
 * CardSection Component
 * Section divider for organizing card content
 */
export const CardSection: React.FC<CardSectionProps> = ({
  children,
  divider = false,
  padding = 16,
  style,
}) => {
  const { theme } = useTheme();

  return (
    <>
      {divider && (
        <View
          style={{
            height: 1,
            backgroundColor: theme.colors.border,
            marginVertical: 8,
          }}
        />
      )}
      <View style={[{ padding }, style]}>{children}</View>
    </>
  );
};

/**
 * Card Footer Props
 */
export interface CardFooterProps {
  /** Footer content (typically buttons) */
  children: ReactNode;
  /** Layout direction */
  direction?: 'row' | 'column';
  /** Alignment of items */
  align?: 'start' | 'center' | 'end' | 'space-between';
  /** Gap between items */
  gap?: number;
  /** Custom styles */
  style?: ViewStyle;
}

/**
 * CardFooter Component
 * Pre-styled footer for cards with action buttons
 */
export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  direction = 'row',
  align = 'end',
  gap = 12,
  style,
}) => {
  const { theme } = useTheme();

  const alignmentMap: Record<string, 'flex-start' | 'center' | 'flex-end' | 'space-between'> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    'space-between': 'space-between',
  };

  return (
    <View
      style={[
        {
          flexDirection: direction,
          justifyContent: alignmentMap[align],
          alignItems: direction === 'row' ? 'center' : 'stretch',
          gap,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardHeaderAction: {
    marginLeft: 12,
  },
});

/**
 * Usage Examples:
 *
 * // Simple Card
 * <Card>
 *   <Text>Card content</Text>
 * </Card>
 *
 * // Pressable Card
 * <Card onPress={() => console.log('pressed')}>
 *   <Text>Tap me!</Text>
 * </Card>
 *
 * // Card with Header and Footer
 * <Card variant="elevated">
 *   <CardHeader
 *     title="Event Title"
 *     subtitle="Today at 3:00 PM"
 *     action={<Icon name="More" />}
 *   />
 *   <Text>Event description here</Text>
 *   <CardFooter>
 *     <Button>Edit</Button>
 *     <Button variant="secondary">Delete</Button>
 *   </CardFooter>
 * </Card>
 *
 * // Card with Sections
 * <Card>
 *   <CardSection>
 *     <Text>First section</Text>
 *   </CardSection>
 *   <CardSection divider>
 *     <Text>Second section with divider</Text>
 *   </CardSection>
 * </Card>
 */
