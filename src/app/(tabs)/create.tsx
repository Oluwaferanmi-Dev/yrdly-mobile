import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

const GREEN = '#388E3C';
type PostCategory = 'General' | 'For Sale' | 'Event';

export default function CreateTab() {
  const [category, setCategory] = useState<PostCategory>('General');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [price, setPrice] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    // Step 5 implementation goes here!
    setIsSubmitting(true);
    console.log('Submitting post with:', { category, title, text, price, imageUri });
    setTimeout(() => {
      setIsSubmitting(false);
      // Reset form
      setTitle('');
      setText('');
      setPrice('');
      setImageUri(null);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Category Selector */}
          <Text style={styles.sectionLabel}>What are you creating?</Text>
          <View style={styles.categoryRow}>
            {(['General', 'For Sale', 'Event'] as PostCategory[]).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryButton, category === cat && styles.categoryActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form Fields */}
          <View style={styles.formGroup}>
            <TextInput
              style={styles.inputTitle}
              placeholder="Give it a title (optional)"
              placeholderTextColor="#9E9E9E"
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={styles.inputBody}
              placeholder={category === 'General' ? "What's going on?" : "Describe it..."}
              placeholderTextColor="#9E9E9E"
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
            />

            {category === 'For Sale' && (
              <TextInput
                style={styles.inputPrice}
                placeholder="Price (₦)"
                placeholderTextColor="#9E9E9E"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
            )}
          </View>

          {/* Media Picker */}
          <Text style={styles.sectionLabel}>Add Media</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={32} color="#9E9E9E" />
                <Text style={styles.imagePlaceholderText}>Tap to add a photo</Text>
              </View>
            )}
          </TouchableOpacity>
          {imageUri && (
            <TouchableOpacity style={styles.removeImage} onPress={() => setImageUri(null)}>
              <Text style={styles.removeImageText}>Remove photo</Text>
            </TouchableOpacity>
          )}

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>Post to Yrdly</Text>
            )}
          </TouchableOpacity>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#616161',
    marginBottom: 8,
    marginTop: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F2F2F2',
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryActive: {
    backgroundColor: '#E8F5E9',
    borderColor: GREEN,
  },
  categoryText: {
    fontSize: 14,
    color: '#616161',
    fontWeight: '600',
  },
  categoryTextActive: {
    color: GREEN,
  },
  formGroup: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F2F2F2',
    marginBottom: 16,
  },
  inputTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1C',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 8,
  },
  inputBody: {
    fontSize: 16,
    color: '#1C1C1C',
    minHeight: 100,
    paddingVertical: 8,
  },
  inputPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: GREEN,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 8,
  },
  imagePicker: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F2F2F2',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#9E9E9E',
    fontSize: 14,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImage: {
    alignSelf: 'center',
    marginTop: 8,
    padding: 8,
  },
  removeImageText: {
    color: '#E53935',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: GREEN,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
