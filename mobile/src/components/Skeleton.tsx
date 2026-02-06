/**
 * Skeleton component for DropCal mobile app
 * Replaces react-loading-skeleton with custom Animated implementation
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Base Skeleton Props
 */
interface SkeletonBaseProps {
  /** Width of skeleton (number = pixels, string = percentage or 'auto') */
  width?: number | string;
  /** Height of skeleton (number = pixels) */
  height?: number;
  /** Border radius */
  borderRadius?: number;
  /** Custom styles */
  style?: ViewStyle;
  /** Whether skeleton is visible/loading */
  isLoading?: boolean;
}

/**
 * Base Skeleton Component with shimmer animation
 */
export const Skeleton: React.FC<SkeletonBaseProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
  isLoading = true,
}) => {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoading) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [isLoading, animatedValue]);

  if (!isLoading) return null;

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.3],
  });

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: theme.colors.skeletonBackground,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: theme.colors.skeletonBorder,
            opacity,
          },
        ]}
      />
    </View>
  );
};

/**
 * Text Skeleton Props
 */
interface SkeletonTextProps extends Omit<SkeletonBaseProps, 'height'> {
  /** Text variant (determines height and font size) */
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  /** Number of lines to show */
  lines?: number;
  /** Width of last line (for multi-line skeletons) */
  lastLineWidth?: number | string;
}

/**
 * Text Skeleton Component
 * Creates skeleton placeholders for text with different variants
 */
export const SkeletonText: React.FC<SkeletonTextProps> = ({
  variant = 'body',
  lines = 1,
  lastLineWidth,
  width,
  ...props
}) => {
  const { theme } = useTheme();

  // Map variants to heights based on typography
  const heights: Record<string, number> = {
    h1: 44,
    h2: 32,
    h3: 28,
    body: 24,
    caption: 16,
    label: 16,
  };

  const height = heights[variant] || 24;

  if (lines === 1) {
    return <Skeleton width={width || '100%'} height={height} {...props} />;
  }

  // Multiple lines
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: lines }).map((_, index) => {
        const isLastLine = index === lines - 1;
        const lineWidth = isLastLine && lastLineWidth ? lastLineWidth : width || '100%';

        return (
          <Skeleton
            key={index}
            width={lineWidth}
            height={height}
            {...props}
          />
        );
      })}
    </View>
  );
};

/**
 * Avatar Skeleton Props
 */
interface SkeletonAvatarProps extends Omit<SkeletonBaseProps, 'width' | 'height'> {
  /** Size of avatar */
  size?: 'small' | 'medium' | 'large' | number;
  /** Shape of avatar */
  shape?: 'circle' | 'square' | 'rounded';
}

/**
 * Avatar Skeleton Component
 */
export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 'medium',
  shape = 'circle',
  ...props
}) => {
  // Map size presets to pixels
  const sizeMap: Record<string, number> = {
    small: 32,
    medium: 48,
    large: 64,
  };

  const dimension = typeof size === 'number' ? size : sizeMap[size];

  // Map shape to border radius
  const radiusMap: Record<string, number> = {
    circle: dimension / 2,
    square: 0,
    rounded: 8,
  };

  const borderRadius = radiusMap[shape];

  return (
    <Skeleton
      width={dimension}
      height={dimension}
      borderRadius={borderRadius}
      {...props}
    />
  );
};

/**
 * Card Skeleton Props
 */
interface SkeletonCardProps extends SkeletonBaseProps {
  /** Whether to show avatar */
  hasAvatar?: boolean;
  /** Whether to show image/thumbnail */
  hasImage?: boolean;
  /** Number of text lines */
  lines?: number;
  /** Whether to show action buttons */
  hasActions?: boolean;
}

/**
 * Card Skeleton Component
 * Pre-built skeleton for card layouts
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  hasAvatar = false,
  hasImage = false,
  lines = 3,
  hasActions = false,
  width = '100%',
  style,
  ...props
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          width: width as any,
          padding: 16,
          backgroundColor: theme.colors.background,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.border,
          gap: 12,
        },
        style,
      ]}
    >
      {/* Header with avatar */}
      {hasAvatar && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SkeletonAvatar size="small" {...props} />
          <SkeletonText variant="body" width="40%" {...props} />
        </View>
      )}

      {/* Image thumbnail */}
      {hasImage && (
        <Skeleton width="100%" height={200} borderRadius={8} {...props} />
      )}

      {/* Text lines */}
      <SkeletonText variant="body" lines={lines} lastLineWidth="60%" {...props} />

      {/* Action buttons */}
      {hasActions && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Skeleton width={100} height={36} borderRadius={8} {...props} />
          <Skeleton width={100} height={36} borderRadius={8} {...props} />
        </View>
      )}
    </View>
  );
};

/**
 * List Skeleton Props
 */
interface SkeletonListProps {
  /** Number of items in list */
  count?: number;
  /** Gap between items (pixels) */
  gap?: number;
  /** Render function for each item */
  renderItem?: (index: number) => React.ReactNode;
  /** Whether skeleton is visible/loading */
  isLoading?: boolean;
}

/**
 * List Skeleton Component
 * Renders multiple skeleton items in a list
 */
export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  gap = 12,
  renderItem,
  isLoading = true,
}) => {
  if (!isLoading) return null;

  const defaultRenderItem = (index: number) => (
    <SkeletonCard key={index} hasAvatar lines={2} />
  );

  return (
    <View style={{ gap }}>
      {Array.from({ length: count }).map((_, index) =>
        renderItem ? renderItem(index) : defaultRenderItem(index)
      )}
    </View>
  );
};
