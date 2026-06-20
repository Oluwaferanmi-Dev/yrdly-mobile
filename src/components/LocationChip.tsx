import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useLocation } from '../context/LocationContext';
import { useAppTheme } from '../context/ThemeContext';

export function LocationChip() {
  const { colors } = useAppTheme();
  const { displayLabel, activeFilter, setGlobalFilter, userProfileLocation, hasLocation } = useLocation();
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (type: 'all' | 'state' | 'lga' | 'ward') => {
    if (!hasLocation || !userProfileLocation) {
      setModalVisible(false);
      return;
    }

    if (type === 'all') {
      setGlobalFilter(null);
    } else if (type === 'state') {
      setGlobalFilter({ state: userProfileLocation.state });
    } else if (type === 'lga') {
      setGlobalFilter({ state: userProfileLocation.state, lga: userProfileLocation.lga });
    } else if (type === 'ward') {
      setGlobalFilter({ state: userProfileLocation.state, lga: userProfileLocation.lga, ward: userProfileLocation.ward });
    }
    setModalVisible(false);
  };

  const currentType = !activeFilter ? 'all' 
    : activeFilter.ward ? 'ward' 
    : activeFilter.lga ? 'lga' 
    : 'state';

  return (
    <>
      <TouchableOpacity 
        style={[styles.chip, { backgroundColor: colors.inputBackground, borderColor: colors.borderLight }]} 
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="location-sharp" size={14} color={colors.tint} />
        <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
          {displayLabel}
        </Text>
        <Feather name="chevron-down" size={14} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>View Area</Text>
          
          <TouchableOpacity 
            style={[styles.modalOption, { borderBottomColor: colors.borderLight }]}
            onPress={() => handleSelect('all')}
          >
            <Text style={[styles.modalOptionText, { color: colors.text }]}>All Nigeria</Text>
            {currentType === 'all' && <Feather name="check" size={20} color={colors.tint} />}
          </TouchableOpacity>

          {hasLocation && userProfileLocation?.state && (
            <TouchableOpacity 
              style={[styles.modalOption, { borderBottomColor: colors.borderLight }]}
              onPress={() => handleSelect('state')}
            >
              <Text style={[styles.modalOptionText, { color: colors.text }]}>{userProfileLocation.state} State</Text>
              {currentType === 'state' && <Feather name="check" size={20} color={colors.tint} />}
            </TouchableOpacity>
          )}

          {hasLocation && userProfileLocation?.lga && (
            <TouchableOpacity 
              style={[styles.modalOption, { borderBottomColor: colors.borderLight }]}
              onPress={() => handleSelect('lga')}
            >
              <Text style={[styles.modalOptionText, { color: colors.text }]}>{userProfileLocation.lga}</Text>
              {currentType === 'lga' && <Feather name="check" size={20} color={colors.tint} />}
            </TouchableOpacity>
          )}

          {hasLocation && userProfileLocation?.ward && (
            <TouchableOpacity 
              style={[styles.modalOption, { borderBottomColor: colors.borderLight }]}
              onPress={() => handleSelect('ward')}
            >
              <Text style={[styles.modalOptionText, { color: colors.text }]}>{userProfileLocation.ward} (Ward)</Text>
              {currentType === 'ward' && <Feather name="check" size={20} color={colors.tint} />}
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.closeModalButton, { backgroundColor: colors.inputBackground }]}
            onPress={() => setModalVisible(false)}
          >
            <Text style={[styles.closeModalButtonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    maxWidth: 160,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  closeModalButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
