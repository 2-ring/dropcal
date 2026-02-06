import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { Icon } from '../../components/Icon';
import { useTheme } from '../../theme';

export interface AudioRecorderProps {
  /** Callback when recording is cancelled */
  onClose: () => void;
  /** Callback when recording is submitted with audio blob */
  onSubmit: (audioBlob: Blob) => void;
  /** Callback to upload an audio file instead of recording */
  onUploadFile: () => void;
}

const WINDOW_WIDTH = Dimensions.get('window').width;
const NUM_BARS = 32;

/**
 * Audio Recording Screen for React Native
 *
 * Uses expo-av for audio recording with decorative visualization.
 * Auto-starts recording on mount.
 *
 * @example
 * ```tsx
 * import { AudioRecorder } from '@/screens/input';
 * import { pickAudio } from '@/utils/fileUpload';
 *
 * function MyScreen() {
 *   const handleSubmit = async (audioBlob: Blob) => {
 *     // Send blob to backend API
 *     const formData = new FormData();
 *     formData.append('audio', audioBlob, 'recording.m4a');
 *     await fetch('/api/upload', { method: 'POST', body: formData });
 *   };
 *
 *   const handleUpload = async () => {
 *     // Let user pick an existing audio file
 *     const file = await pickAudio();
 *     if (file) {
 *       // Process the uploaded file
 *     }
 *   };
 *
 *   return (
 *     <AudioRecorder
 *       onClose={() => navigation.goBack()}
 *       onSubmit={handleSubmit}
 *       onUploadFile={handleUpload}
 *     />
 *   );
 * }
 * ```
 */
export function AudioRecorder({ onClose, onSubmit, onUploadFile }: AudioRecorderProps) {
  const { theme } = useTheme();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Animation values for the audio visualization bars
  const barAnimations = useRef(
    Array.from({ length: NUM_BARS }, () => new Animated.Value(0.2))
  ).current;

  // Duration timer
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  // Start recording on mount
  useEffect(() => {
    startRecording();

    return () => {
      stopRecordingCleanup();
    };
  }, []);

  // Animate bars while recording
  useEffect(() => {
    if (isRecording) {
      animateBars();
    }
  }, [isRecording]);

  // Animate the visualization bars
  const animateBars = () => {
    const animations = barAnimations.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: Math.random() * 0.8 + 0.2,
            duration: 200 + Math.random() * 200,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0.2 + Math.random() * 0.3,
            duration: 200 + Math.random() * 200,
            useNativeDriver: false,
          }),
        ])
      );
    });

    Animated.stagger(50, animations).start();
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();

      if (!permission.granted) {
        setPermissionDenied(true);
        Alert.alert(
          'Permission Required',
          'Microphone access is required to record audio. Please enable it in your device settings.',
          [{ text: 'OK', onPress: onClose }]
        );
        return;
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);

      // Start duration counter
      durationInterval.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert(
        'Recording Error',
        'Failed to start recording. Please try again.',
        [{ text: 'OK', onPress: onClose }]
      );
    }
  };

  // Stop recording and cleanup
  const stopRecordingCleanup = async () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }

    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    }

    setIsRecording(false);
  };

  // Convert recording to Blob
  const convertToBlob = async (uri: string): Promise<Blob> => {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      return await response.blob();
    }

    // For native platforms, we need to read the file
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!recording) {
      Alert.alert('No Recording', 'No audio has been recorded yet.');
      return;
    }

    try {
      // Stop recording
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        Alert.alert('Error', 'Failed to get recording URI.');
        return;
      }

      // Convert to blob
      const blob = await convertToBlob(uri);

      // Submit the blob
      onSubmit(blob);
    } catch (error) {
      console.error('Error submitting recording:', error);
      Alert.alert('Error', 'Failed to submit recording. Please try again.');
    }
  };

  // Handle close
  const handleClose = async () => {
    await stopRecordingCleanup();
    onClose();
  };

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (permissionDenied) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Icon name="Warning" size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
            Microphone permission is required
          </Text>
          <Pressable
            style={[styles.closeButtonError, { backgroundColor: theme.colors.surface }]}
            onPress={onClose}
          >
            <Icon name="X" size={24} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
      {/* Backdrop overlay */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleClose}
      />

      {/* Input Container - Centered */}
      <View style={styles.inputContainer}>
        {/* Upload Button - Outside dock (left) */}
        <Animated.View style={styles.externalButtonWrapper}>
          <Pressable
            style={[styles.externalButton, { backgroundColor: theme.colors.background }]}
            onPress={onUploadFile}
          >
            <Icon name="FirstAid" size={24} color={theme.colors.primary} weight="duotone" />
          </Pressable>
        </Animated.View>

        {/* Close Button - Outside dock (left of dock) */}
        <Animated.View style={styles.externalButtonWrapper}>
          <Pressable
            style={[styles.closeButton, {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
            }]}
            onPress={handleClose}
          >
            <Icon
              name="FirstAid"
              size={24}
              color={theme.colors.textSecondary}
              weight="duotone"
              style={{ transform: [{ rotate: '45deg' }] }}
            />
          </Pressable>
        </Animated.View>

        {/* Dock - 100px border-radius pill with auto height */}
        <Animated.View
          style={[
            styles.dock,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Audio Visualization */}
          <View style={styles.visualizerWrapper}>
            <View style={styles.visualizer}>
              {barAnimations.map((anim, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.bar,
                    { backgroundColor: theme.colors.primary },
                    {
                      height: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [4, 40],
                      }),
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Submit Button - Outside dock (right) */}
        <Animated.View style={styles.externalButtonWrapper}>
          <Pressable
            style={[
              styles.submitButton,
              {
                backgroundColor: isRecording || recording
                  ? theme.colors.primary
                  : theme.colors.disabled,
              },
            ]}
            onPress={handleSubmit}
            disabled={!isRecording && !recording}
          >
            <Icon
              name="ArrowFatUp"
              size={28}
              color="#ffffff"
              weight="bold"
            />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  closeButtonError: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 600,
    paddingHorizontal: 20,
  },
  externalButtonWrapper: {
    // Animation wrapper
  },

  // Dock - 100px border-radius pill (auto height for visualizer)
  dock: {
    flex: 1,
    minHeight: 64,
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Visualizer
  visualizerWrapper: {
    flex: 1,
    height: 40,
  },
  visualizer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 8,
    minHeight: 4,
  },

  // External Buttons (outside dock)
  externalButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  submitButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
