import React, { useState, forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface CommentInputProps {
  userAvatarSource: string;
  userInitial: string;
  replyingTo: { id: string; name: string } | null;
  onClearReply: () => void;
  onSubmit: (text: string, parentId?: string) => Promise<void>;
  InputComponent?: any; // To allow passing BottomSheetTextInput
}

export interface CommentInputRef {
  focus: () => void;
}

export const CommentInput = forwardRef<CommentInputRef, CommentInputProps>(({
  userAvatarSource,
  userInitial,
  replyingTo,
  onClearReply,
  onSubmit,
  InputComponent = TextInput
}, ref) => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }));

  const avatarSource = useMemo(() => ({ uri: userAvatarSource }), [userAvatarSource]);

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    setSending(true);
    const body = inputText.trim();
    setInputText('');
    
    try {
      await onSubmit(body, replyingTo?.id);
      onClearReply();
    } catch (e) {
      console.error(e);
      setInputText(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.container, { borderTopColor: colors.borderLight, backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 12) }]}>
      {replyingTo && (
        <View style={styles.replyBanner}>
          <Text style={[styles.replyBannerText, { color: colors.textMuted }]}>
            Replying to <Text style={{ fontWeight: 'bold' }}>{replyingTo.name}</Text>
          </Text>
          <TouchableOpacity onPress={onClearReply} style={styles.clearReplyBtn}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.inputRow}>
        <View style={styles.inputAvatar}>
          {userAvatarSource ? (
            <Image source={avatarSource} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <View style={[styles.avatarImg, styles.avatarFallback, { backgroundColor: colors.tint }]}>
              <Text style={styles.avatarFallbackText}>{userInitial}</Text>
            </View>
          )}
        </View>
        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground }]}>
          <InputComponent
            ref={inputRef}
            style={[styles.input, { color: colors.text }]}
            placeholder={replyingTo ? `Reply to ${replyingTo.name}...` : "Add a comment..."}
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Text style={[
                styles.sendText,
                { color: inputText.trim() ? '#82DB7E' : colors.textMuted }
              ]}>
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  replyBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  replyBannerText: {
    fontSize: 13,
  },
  clearReplyBtn: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputAvatar: {
    marginRight: 12,
  },
  avatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 40,
  },
  input: {
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
