import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Logo, Icon, Card, Modal, toast } from '../components';
import {
  TextInputScreen,
  LinkInputScreen,
  EmailInputScreen,
  AudioRecorder,
} from './input';
import { useTheme } from '../theme';
import { pickImage, pickDocument, createFormData } from '../utils/fileUpload';
import * as backendClient from '../api/backend-client';

// Navigation type (will be properly typed when navigation structure is finalized)
type NavigationProp = any;

/**
 * Input option card type
 */
interface InputOption {
  id: string;
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
}

/**
 * HomeScreen - Main screen with input options
 * Task 36: Create Home Screen
 */
export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);

  /**
   * Get greeting message based on time of day
   */
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  /**
   * Handle text submission
   */
  const handleTextSubmit = useCallback(async (text: string) => {
    try {
      setIsProcessing(true);
      setShowTextInput(false);

      const session = await backendClient.createTextSession(text);

      // Navigate to events list with session data
      // TODO: Implement navigation to EventsList screen with session
      toast.success('Processing Complete', {
        description: `Found ${session.events?.length || 0} events`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error processing text:', error);
      toast.error('Processing Failed', {
        description: error instanceof Error ? error.message : 'Could not process text',
        duration: 4000,
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Handle link submission
   */
  const handleLinkSubmit = useCallback(async (url: string) => {
    try {
      setIsProcessing(true);
      setShowLinkInput(false);

      const session = await backendClient.createLinkSession(url);

      toast.success('Processing Complete', {
        description: `Found ${session.events?.length || 0} events`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error processing link:', error);
      toast.error('Processing Failed', {
        description: error instanceof Error ? error.message : 'Could not process link',
        duration: 4000,
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Handle audio submission
   */
  const handleAudioSubmit = useCallback(async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      setShowAudioRecorder(false);

      // Convert blob to FormData
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.wav');

      const session = await backendClient.uploadFile(formData);

      toast.success('Processing Complete', {
        description: `Found ${session.events?.length || 0} events`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error('Processing Failed', {
        description: error instanceof Error ? error.message : 'Could not process audio',
        duration: 4000,
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Handle image upload
   */
  const handleImageUpload = useCallback(async () => {
    try {
      const file = await pickImage();
      if (!file) return;

      setIsProcessing(true);

      const formData = await createFormData(file);
      const session = await backendClient.uploadFile(formData);

      toast.success('Processing Complete', {
        description: `Found ${session.events?.length || 0} events`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Upload Failed', {
        description: error instanceof Error ? error.message : 'Could not upload image',
        duration: 4000,
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Handle document upload
   */
  const handleDocumentUpload = useCallback(async () => {
    try {
      const file = await pickDocument({
        type: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      });
      if (!file) return;

      setIsProcessing(true);

      const formData = await createFormData(file);
      const session = await backendClient.uploadFile(formData);

      toast.success('Processing Complete', {
        description: `Found ${session.events?.length || 0} events`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Upload Failed', {
        description: error instanceof Error ? error.message : 'Could not upload document',
        duration: 4000,
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Define input options
   */
  const inputOptions: InputOption[] = [
    {
      id: 'text',
      title: 'Text',
      icon: 'Pen',
      color: theme.colors.primary,
      onPress: () => setShowTextInput(true),
    },
    {
      id: 'link',
      title: 'Link',
      icon: 'Link',
      color: '#10B981', // Green
      onPress: () => setShowLinkInput(true),
    },
    {
      id: 'image',
      title: 'Image',
      icon: 'Image',
      color: '#8B5CF6', // Purple
      onPress: handleImageUpload,
    },
    {
      id: 'document',
      title: 'Document',
      icon: 'File',
      color: '#F59E0B', // Amber
      onPress: handleDocumentUpload,
    },
    {
      id: 'audio',
      title: 'Audio',
      icon: 'Microphone',
      color: '#EF4444', // Red
      onPress: () => setShowAudioRecorder(true),
    },
    {
      id: 'email',
      title: 'Email',
      icon: 'Envelope',
      color: '#3B82F6', // Blue
      onPress: () => setShowEmailInput(true),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Logo and Greeting */}
        <View style={styles.header}>
          <Logo size={48} />
          <Text style={[styles.greeting, { color: theme.colors.textPrimary }]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Drop anything in. Get calendar events out.
          </Text>
        </View>

        {/* Input Options Grid */}
        <View style={styles.optionsGrid}>
          {inputOptions.map((option, index) => (
            <Pressable
              key={option.id}
              style={({ pressed }) => [
                styles.optionCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={option.onPress}
              disabled={isProcessing}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${option.color}15` },
                ]}
              >
                <Icon name={option.icon} size={32} color={option.color} />
              </View>
              <Text style={[styles.optionTitle, { color: theme.colors.textPrimary }]}>
                {option.title}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Processing Indicator */}
        {isProcessing && (
          <View style={styles.processingContainer}>
            <Text style={[styles.processingText, { color: theme.colors.textSecondary }]}>
              Processing...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Text Input Modal */}
      <Modal visible={showTextInput} transparent animationType="slide">
        <TextInputScreen
          onClose={() => setShowTextInput(false)}
          onSubmit={handleTextSubmit}
        />
      </Modal>

      {/* Link Input Modal */}
      <Modal visible={showLinkInput} transparent animationType="slide">
        <LinkInputScreen
          onClose={() => setShowLinkInput(false)}
          onSubmit={handleLinkSubmit}
        />
      </Modal>

      {/* Email Input Modal */}
      <Modal visible={showEmailInput} transparent animationType="slide">
        <EmailInputScreen
          onClose={() => setShowEmailInput(false)}
        />
      </Modal>

      {/* Audio Recorder Modal */}
      <Modal visible={showAudioRecorder} transparent animationType="slide">
        <AudioRecorder
          onClose={() => setShowAudioRecorder(false)}
          onSubmit={handleAudioSubmit}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  optionCard: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  processingContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  processingText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
