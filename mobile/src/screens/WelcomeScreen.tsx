import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Icon, Logo } from '../components';
import { useTheme } from '../theme';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

/**
 * Animated particle for funnel visualization
 */
function AnimatedParticle({ delay, color }: { delay: number; color: string }) {
  const translateX = useRef(new Animated.Value(-50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 50,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        translateX.setValue(-50);
        opacity.setValue(0);
        animate();
      });
    };

    animate();
  }, [delay, translateX, opacity]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: color,
          opacity,
          transform: [{ translateX }],
        },
      ]}
    />
  );
}

/**
 * Funnel SVG icon representing the app's purpose
 */
function FunnelIcon({ size = 140 }: { size?: number }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.appIconContainer, { width: size, height: size }]}>
      <View style={[styles.appIconBackground, { backgroundColor: theme.colors.primary }]}>
        <Logo size={size * 0.65} />
      </View>
    </View>
  );
}

/**
 * Input types flowing into the funnel
 */
function InputStream() {
  const { theme } = useTheme();

  const inputs = [
    { icon: 'Image', label: 'Images' },
    { icon: 'File', label: 'Documents' },
    { icon: 'Microphone', label: 'Audio' },
    { icon: 'Pen', label: 'Text' },
  ];

  return (
    <View style={styles.inputStream}>
      {inputs.map((input, index) => (
        <View key={input.label} style={styles.inputItem}>
          <View style={[styles.inputIconWrapper, { backgroundColor: theme.colors.surface }]}>
            <Icon name={input.icon as any} size={20} color={theme.colors.primary} weight="duotone" />
          </View>
          <AnimatedParticle delay={index * 400} color={theme.colors.primary} />
        </View>
      ))}
    </View>
  );
}

/**
 * Event cards flowing out of the funnel
 */
function EventDisplay() {
  const { theme } = useTheme();

  const events = [
    { title: 'Team Meeting', time: '2:00 PM', color: '#7C3AED' },
    { title: 'CS Lecture', time: '10:00 AM', color: '#059669' },
    { title: 'Coffee Chat', time: '4:00 PM', color: theme.colors.primary },
  ];

  return (
    <View style={styles.eventDisplay}>
      {events.map((event, index) => (
        <View key={index} style={[styles.eventCard, { borderLeftColor: event.color }]}>
          <Text style={[styles.eventTitle, { color: theme.colors.textPrimary }]}>
            {event.title}
          </Text>
          <View style={styles.eventMeta}>
            <Icon name="Clock" size={12} color={theme.colors.textSecondary} weight="bold" />
            <Text style={[styles.eventTime, { color: theme.colors.textSecondary }]}>
              {event.time}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * WelcomeScreen - First-launch welcome screen with funnel animation
 * Shows on first app launch (tracked via AsyncStorage)
 */
export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  const { theme } = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 768;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Logo size={32} />
      </View>

      {/* Main Content */}
      <View style={styles.main}>
        <View style={styles.content}>
          {/* Hero Text */}
          <Text style={[styles.hero, { color: theme.colors.primary }]}>
            Drop anything in.{'\n'}Get events out.
          </Text>

          {/* Funnel Animation */}
          <View style={styles.funnelContainer}>
            {!isMobile && (
              <View style={styles.funnelSection}>
                <InputStream />
              </View>
            )}

            <View style={styles.funnelCenterSection}>
              <FunnelIcon size={isMobile ? 100 : 140} />
            </View>

            {!isMobile && (
              <View style={styles.funnelSection}>
                <EventDisplay />
              </View>
            )}
          </View>

          {/* CTA Button */}
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: theme.colors.primary },
              pressed && styles.ctaButtonPressed,
            ]}
            onPress={onGetStarted}
          >
            <Icon name="ShootingStar" size={22} color="#ffffff" weight="duotone" />
            <Text style={styles.ctaText}>See the magic</Text>
            <Icon name="Link" size={18} color="#ffffff" weight="bold" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: 800,
    alignItems: 'center',
    gap: 32,
  },
  hero: {
    fontFamily: 'Chillax',
    fontSize: 44,
    fontWeight: '700',
    lineHeight: 50,
    textAlign: 'center',
    letterSpacing: -0.88,
    textShadowColor: 'rgba(17, 112, 197, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  // Funnel Animation
  funnelContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    minHeight: 200,
  },
  funnelSection: {
    flex: 1,
    alignItems: 'center',
  },
  funnelCenterSection: {
    flexShrink: 0,
    zIndex: 10,
  },

  // App Icon
  appIconContainer: {
    position: 'relative',
  },
  appIconBackground: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },

  // Input Stream
  inputStream: {
    gap: 16,
  },
  inputItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  // Particle Animation
  particle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Event Display
  eventDisplay: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    minWidth: 200,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '500',
  },

  // CTA Button
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
