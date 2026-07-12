import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, Modal, FlatList,
  TextInput, SafeAreaView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import {
  detectLocation,
  getAllStates,
  getLgasForState,
  OUTSIDE_NIGERIA,
  PERMISSION_DENIED,
  ResolvedLocation,
} from '../lib/geocoding-service';
import { useAppTheme } from '../context/ThemeContext';

export interface LocationValue {
  state: string;
  lga: string;
  displayAddress?: string;
  lat?: number;
  lng?: number;
}

interface LocationPickerProps {
  value: LocationValue;
  onChange: (loc: LocationValue) => void;
}

type PickerMode = 'state' | 'lga';

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const { colors } = useAppTheme();
  const [detecting, setDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<
    'success' | 'outside' | 'denied' | null
  >(null);

  // Modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>('state');
  const [search, setSearch] = useState('');

  const allStates = getAllStates();
  const lgas = value.state ? getLgasForState(value.state) : [];

  const handleAutoDetect = useCallback(async () => {
    setDetecting(true);
    setDetectionResult(null);
    try {
      const result = await detectLocation();
      if ('status' in result) {
        setDetectionResult(result.status === PERMISSION_DENIED ? 'denied' : 'outside');
      } else {
        const loc = result as ResolvedLocation;
        onChange({
          state: loc.state,
          lga: loc.lga,
          displayAddress: loc.displayAddress,
          lat: loc.lat,
          lng: loc.lng,
        });
        setDetectionResult('success');
      }
    } catch {
      setDetectionResult('outside');
    } finally {
      setDetecting(false);
    }
  }, [onChange]);

  const openPicker = (mode: PickerMode) => {
    setPickerMode(mode);
    setSearch('');
    setPickerVisible(true);
  };

  const handleSelectState = (state: string) => {
    onChange({ state, lga: '' });
    setPickerVisible(false);
  };

  const handleSelectLga = (lga: string) => {
    onChange({ ...value, lga });
    setPickerVisible(false);
  };

  const filteredItems =
    pickerMode === 'state'
      ? allStates.filter((s) => s.toLowerCase().includes(search.toLowerCase()))
      : lgas.filter((l) => l.toLowerCase().includes(search.toLowerCase()));

  return (
    <View>
      {/* GPS Auto-detect button */}
      <TouchableOpacity
        style={[styles.gpsBtn, { borderColor: colors.tint }, detecting && styles.gpsBtnLoading]}
        onPress={handleAutoDetect}
        disabled={detecting}
        activeOpacity={0.8}
      >
        {detecting ? (
          <>
            <ActivityIndicator size="small" color={colors.tint} style={{ marginRight: 8 }} />
            <Text style={[styles.gpsBtnText, { color: colors.tint }]}>Detecting your location…</Text>
          </>
        ) : (
          <>
            <Ionicons name="location-outline" size={18} color={colors.tint} style={{ marginRight: 8 }} />
            <Text style={[styles.gpsBtnText, { color: colors.tint }]}>Auto-detect my location</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Detection result feedback */}
      {detectionResult === 'success' && (
        <View style={[styles.feedback, styles.feedbackSuccess]}>
          <Feather name="check-circle" size={16} color="#2E7D32" />
          <Text style={styles.feedbackTextSuccess}>Location detected successfully!</Text>
        </View>
      )}
      {detectionResult === 'outside' && (
        <View style={[styles.feedback, styles.feedbackWarn]}>
          <Feather name="alert-circle" size={16} color="#E65100" />
          <Text style={styles.feedbackTextWarn}>
            Couldn't detect a Nigerian location. Please select manually below.
          </Text>
        </View>
      )}
      {detectionResult === 'denied' && (
        <View style={[styles.feedback, styles.feedbackWarn]}>
          <Feather name="lock" size={16} color="#E65100" />
          <Text style={styles.feedbackTextWarn}>
            Location permission denied. Please select manually below.
          </Text>
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textMuted }]}>or select manually</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {/* State selector */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.text }]}>State *</Text>
        <TouchableOpacity
          style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }, value.state ? { borderColor: colors.tint } : null]}
          onPress={() => openPicker('state')}
          activeOpacity={0.8}
        >
          <Text style={[styles.selectorText, { color: colors.text }, !value.state && { color: colors.textMuted }]}>
            {value.state || 'Select your state'}
          </Text>
          <Feather name="chevron-down" size={18} color={value.state ? colors.tint : colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* LGA selector */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Local Government Area *</Text>
        <TouchableOpacity
          style={[
            styles.selector,
            { backgroundColor: colors.card, borderColor: colors.border },
            value.lga ? { borderColor: colors.tint } : null,
            !value.state && styles.selectorDisabled,
          ]}
          onPress={() => value.state && openPicker('lga')}
          activeOpacity={0.8}
        >
          <Text style={[styles.selectorText, { color: colors.text }, !value.lga && { color: colors.textMuted }]}>
            {value.lga || (!value.state ? 'Select state first' : 'Select your LGA')}
          </Text>
          <Feather name="chevron-down" size={18} color={value.lga ? colors.tint : colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Picker Modal */}
      <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {pickerMode === 'state' ? 'Select State' : 'Select LGA'}
            </Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.modalClose}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder={pickerMode === 'state' ? 'Search states…' : 'Search LGAs…'}
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected =
                pickerMode === 'state' ? item === value.state : item === value.lga;
              return (
                <TouchableOpacity
                  style={[styles.listItem, isSelected && styles.listItemSelected]}
                  onPress={() =>
                    pickerMode === 'state' ? handleSelectState(item) : handleSelectLga(item)
                  }
                >
                  <Text style={[styles.listItemText, { color: colors.text }, isSelected && { color: colors.tint, fontWeight: '700' }]}>
                    {item}
                  </Text>
                  {isSelected && <Feather name="check" size={18} color={colors.tint} />}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={[styles.itemSep, { backgroundColor: colors.borderLight }]} />}
            keyboardShouldPersistTaps="handled"
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    marginBottom: 12,
    backgroundColor: 'rgba(130, 225, 87, 0.1)',
  },
  gpsBtnLoading: { opacity: 0.7 },
  gpsBtnText: { fontSize: 15, fontWeight: '700' },

  feedback: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  feedbackSuccess: { backgroundColor: 'rgba(130, 225, 87, 0.1)' },
  feedbackWarn: { backgroundColor: 'rgba(230, 81, 0, 0.1)' },
  feedbackTextSuccess: { fontSize: 13, color: '#82E157', flex: 1, lineHeight: 18 },
  feedbackTextWarn: { fontSize: 13, color: '#E65100', flex: 1, lineHeight: 18 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, marginHorizontal: 12, fontWeight: '600' },

  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  selectorDisabled: { opacity: 0.5 },
  selectorText: { fontSize: 16, flex: 1 },

  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalClose: { padding: 4 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 16 },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  listItemSelected: { backgroundColor: 'rgba(130, 225, 87, 0.1)' },
  listItemText: { fontSize: 15 },
  itemSep: { height: 1, marginLeft: 20 },
});

