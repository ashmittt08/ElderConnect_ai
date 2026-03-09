import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import { processVoiceRequest, createRequest } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AiResult {
  category: string;
  priority: string;
  request_summary: string;
}

type ScreenState = 'idle' | 'listening' | 'processing' | 'confirm';

// ─── Constants ────────────────────────────────────────────────────────────────
// Replace with the authenticated elder's ID from your auth context/store.
const ELDER_ID = 'elder_demo_001';

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: '🚨 Urgent',
};

const CATEGORY_LABEL: Record<string, string> = {
  daily_help: 'Daily Help',
  medical: 'Medical',
  emergency: 'Emergency',
  social: 'Social',
  transport: 'Transport',
  other: 'Other',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function VoiceAssistantScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [spokenText, setSpokenText] = useState('');
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Voice event handlers ──────────────────────────────────────────────────
  const onSpeechResults = useCallback((e: SpeechResultsEvent) => {
    const text = e.value?.[0] ?? '';
    setSpokenText(text);
  }, []);

  const onSpeechError = useCallback((e: SpeechErrorEvent) => {
    console.warn('[Voice] error', e.error);
    setErrorMsg('Voice recognition failed. Please try again or type your request.');
    setScreenState('idle');
  }, []);

  const onSpeechEnd = useCallback(() => {
    // Voice SDK fires this when recording stops; processing happens in handleStopListening
  }, []);

  useEffect(() => {
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechEnd = onSpeechEnd;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [onSpeechResults, onSpeechError, onSpeechEnd]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleStartListening = async () => {
    setErrorMsg('');
    setSpokenText('');
    setAiResult(null);

    try {
      await Voice.start('en-US');
      setScreenState('listening');
      AccessibilityInfo.announceForAccessibility('Listening. Please speak your request.');
    } catch (err) {
      setErrorMsg('Could not start voice recognition. Check microphone permissions.');
      console.error('[Voice] start error', err);
    }
  };

  const handleStopListening = async () => {
    try {
      await Voice.stop();
    } catch (err) {
      console.warn('[Voice] stop error', err);
    }

    if (!spokenText.trim()) {
      setErrorMsg('No speech detected. Please try again.');
      setScreenState('idle');
      return;
    }

    await handleProcessText(spokenText);
  };

  const handleProcessText = async (text: string) => {
    setScreenState('processing');
    setErrorMsg('');

    try {
      const result = await processVoiceRequest(text);
      setAiResult(result);
      setScreenState('confirm');
      AccessibilityInfo.announceForAccessibility(
        `Request understood. Category: ${CATEGORY_LABEL[result.category] ?? result.category}. Priority: ${PRIORITY_LABEL[result.priority] ?? result.priority}.`
      );
    } catch (err) {
      console.error('[API] processVoiceRequest error', err);
      setErrorMsg('Could not understand the request. Please check your connection and try again.');
      setScreenState('idle');
    }
  };

  const handleCreateRequest = async () => {
    if (!aiResult) return;

    setScreenState('processing');

    try {
      await createRequest({
        elderId: ELDER_ID,
        requestText: spokenText,
        category: aiResult.category,
        priority: aiResult.priority,
        request_summary: aiResult.request_summary,
      });

      setSpokenText('');
      setAiResult(null);
      setScreenState('idle');

      Alert.alert(
        '✅ Request Sent',
        'Your request has been submitted. A volunteer will assist you shortly.',
        [{ text: 'OK' }]
      );
      AccessibilityInfo.announceForAccessibility('Request submitted successfully.');
    } catch (err) {
      console.error('[API] createRequest error', err);
      setErrorMsg('Failed to submit request. Please check your connection and try again.');
      setScreenState('confirm');
    }
  };

  const handleCancel = async () => {
    if (screenState === 'listening') {
      try {
        await Voice.cancel();
      } catch (_) {}
    }
    setScreenState('idle');
    setSpokenText('');
    setAiResult(null);
    setErrorMsg('');
    AccessibilityInfo.announceForAccessibility('Cancelled.');
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const isListening = screenState === 'listening';
  const isProcessing = screenState === 'processing';
  const isConfirm = screenState === 'confirm';
  const isIdle = screenState === 'idle';

  const micButtonLabel = isListening ? 'Stop Listening' : 'Tap to Speak';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      accessible
    >
      {/* Header */}
      <Text style={styles.title} accessibilityRole="header">
        🎙️ Voice Assistant
      </Text>
      <Text style={styles.subtitle}>Tap the button and speak your request</Text>

      {/* Error message */}
      {!!errorMsg && (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Microphone button */}
      {(isIdle || isListening) && (
        <TouchableOpacity
          style={[styles.micButton, isListening && styles.micButtonActive]}
          onPress={isListening ? handleStopListening : handleStartListening}
          accessibilityLabel={micButtonLabel}
          accessibilityRole="button"
          accessibilityState={{ selected: isListening }}
          disabled={isProcessing}
        >
          <Text style={styles.micIcon}>{isListening ? '⏹' : '🎤'}</Text>
          <Text style={styles.micLabel}>{micButtonLabel}</Text>
        </TouchableOpacity>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <View style={styles.processingBox} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color="#1A73E8" />
          <Text style={styles.processingText}>Understanding your request…</Text>
        </View>
      )}

      {/* Recognised speech text */}
      {!!spokenText && (
        <View style={styles.speechBox} accessibilityLiveRegion="polite">
          <Text style={styles.speechLabel}>You said:</Text>
          <Text style={styles.speechText}>{spokenText}</Text>
        </View>
      )}

      {/* AI result & confirmation */}
      {isConfirm && aiResult && (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>Request Summary</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category:</Text>
            <Text style={styles.infoValue}>
              {CATEGORY_LABEL[aiResult.category] ?? aiResult.category}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Priority:</Text>
            <Text
              style={[
                styles.infoValue,
                aiResult.priority === 'urgent' && styles.urgentText,
                aiResult.priority === 'high' && styles.highText,
              ]}
            >
              {PRIORITY_LABEL[aiResult.priority] ?? aiResult.priority}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Summary:</Text>
            <Text style={styles.infoValue}>{aiResult.request_summary}</Text>
          </View>

          {/* Create Request button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateRequest}
            accessibilityLabel="Create request"
            accessibilityRole="button"
          >
            <Text style={styles.createButtonText}>✅  Create Request</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cancel button — visible when not idle */}
      {!isIdle && !isProcessing && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          accessibilityLabel="Cancel"
          accessibilityRole="button"
        >
          <Text style={styles.cancelButtonText}>✕  Cancel</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F5F7FF',
    alignItems: 'center',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  errorText: {
    color: '#B71C1C',
    fontSize: 16,
    fontWeight: '600',
  },
  micButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#1A73E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    elevation: 6,
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  micButtonActive: {
    backgroundColor: '#D32F2F',
    shadowColor: '#D32F2F',
  },
  micIcon: {
    fontSize: 60,
    marginBottom: 4,
  },
  micLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  processingBox: {
    alignItems: 'center',
    marginVertical: 32,
  },
  processingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#1A73E8',
    fontWeight: '600',
  },
  speechBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#1A73E8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  speechLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A73E8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  speechText: {
    fontSize: 22,
    color: '#1A1A2E',
    lineHeight: 32,
    fontWeight: '500',
  },
  confirmBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#555',
    width: 100,
  },
  infoValue: {
    fontSize: 18,
    color: '#1A1A2E',
    fontWeight: '600',
    flex: 1,
  },
  urgentText: {
    color: '#D32F2F',
  },
  highText: {
    color: '#E65100',
  },
  createButton: {
    backgroundColor: '#1A73E8',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
    elevation: 4,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderWidth: 2,
    borderColor: '#D32F2F',
    marginTop: 4,
    marginBottom: 24,
  },
  cancelButtonText: {
    color: '#D32F2F',
    fontSize: 18,
    fontWeight: '700',
  },
});
