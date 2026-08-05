import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { G, DARK, SURFACE, GLASS_BORDER, LABEL, MUTED, TEXT_PRIMARY } from '../constants/tokens';
import DateTimePicker from '@react-native-community/datetimepicker';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function OpeningHoursPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [startDay, setStartDay] = useState('Mon');
  const [endDay, setEndDay] = useState('Sat');
  
  const [openTime, setOpenTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [showOpenPicker, setShowOpenPicker] = useState(false);

  const [closeTime, setCloseTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(17, 0, 0, 0);
    return d;
  });
  const [showClosePicker, setShowClosePicker] = useState(false);
  
  // Try to parse existing value roughly
  React.useEffect(() => {
    if (value && value.includes('-')) {
       // Just a rough parsing logic for UI init, could be more robust
       const parts = value.split(':');
       if (parts.length > 1) {
         const daysStr = parts[0].trim();
         const daysSplit = daysStr.split('-');
         if (daysSplit.length === 2) {
           setStartDay(daysSplit[0].trim());
           setEndDay(daysSplit[1].trim());
         }
       }
    }
  }, [value]);

  const handleSave = () => {
    const openStr = openTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const closeStr = closeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    onChange(`${startDay}-${endDay}: ${openStr} - ${closeStr}`);
    setVisible(false);
  };

  const handleClear = () => {
    onChange('');
    setVisible(false);
  }

  return (
    <>
      <TouchableOpacity 
        style={styles.pickerBox} 
        onPress={() => setVisible(true)}
      >
        <Text style={{ color: value ? '#fff' : MUTED, fontSize: 15 }}>
          {value || 'Select Opening Hours'}
        </Text>
        <Ionicons name="time-outline" size={20} color={MUTED} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Opening Hours</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.label}>Working Days</Text>
              <View style={styles.row}>
                <View style={styles.pickerCol}>
                   <Text style={styles.sublabel}>From</Text>
                   <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
                     {DAYS.map(d => (
                       <TouchableOpacity key={d} style={[styles.dayBtn, startDay === d && styles.dayBtnActive]} onPress={() => setStartDay(d)}>
                         <Text style={[styles.dayTxt, startDay === d && styles.dayTxtActive]}>{d}</Text>
                       </TouchableOpacity>
                     ))}
                   </ScrollView>
                </View>
              </View>
              <View style={[styles.row, { marginTop: 12 }]}>
                <View style={styles.pickerCol}>
                   <Text style={styles.sublabel}>To</Text>
                   <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
                     {DAYS.map(d => (
                       <TouchableOpacity key={d} style={[styles.dayBtn, endDay === d && styles.dayBtnActive]} onPress={() => setEndDay(d)}>
                         <Text style={[styles.dayTxt, endDay === d && styles.dayTxtActive]}>{d}</Text>
                       </TouchableOpacity>
                     ))}
                   </ScrollView>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Business Hours</Text>
              <View style={styles.timeWrap}>
                <View style={styles.timeBox}>
                   <Text style={styles.sublabel}>Opens</Text>
                   <TouchableOpacity style={styles.timeBtnWrapper} onPress={() => setShowOpenPicker(true)}>
                     <Text style={styles.timeBtnText}>{openTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                   </TouchableOpacity>
                   {showOpenPicker && (
                     <DateTimePicker
                       value={openTime}
                       mode="time"
                       display="default"
                       onChange={(event, selectedTime) => {
                         setShowOpenPicker(false);
                         if (selectedTime) setOpenTime(selectedTime);
                       }}
                     />
                   )}
                </View>
                <View style={styles.timeBox}>
                   <Text style={styles.sublabel}>Closes</Text>
                   <TouchableOpacity style={styles.timeBtnWrapper} onPress={() => setShowClosePicker(true)}>
                     <Text style={styles.timeBtnText}>{closeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                   </TouchableOpacity>
                   {showClosePicker && (
                     <DateTimePicker
                       value={closeTime}
                       mode="time"
                       display="default"
                       onChange={(event, selectedTime) => {
                         setShowClosePicker(false);
                         if (selectedTime) setCloseTime(selectedTime);
                       }}
                     />
                   )}
                </View>
              </View>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                <Text style={styles.clearBtnTxt}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnTxt}>Save Hours</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pickerBox: { width: '100%', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  section: { marginBottom: 24 },
  label: { color: LABEL, fontSize: 14, fontWeight: '600', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  pickerCol: { flex: 1 },
  sublabel: { color: MUTED, fontSize: 12, marginBottom: 8, textTransform: 'uppercase' },
  dayScroll: { flexGrow: 0 },
  dayBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: SURFACE, marginRight: 8, borderWidth: 1, borderColor: GLASS_BORDER },
  dayBtnActive: { backgroundColor: 'rgba(130,219,126,0.15)', borderColor: G },
  dayTxt: { color: MUTED, fontSize: 13 },
  dayTxtActive: { color: G, fontWeight: '600' },
  timeWrap: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  timeBox: { flex: 1 },
  timeBtnWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: 'center',
  },
  timeBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  clearBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: SURFACE, alignItems: 'center' },
  clearBtnTxt: { color: '#fff', fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: G, alignItems: 'center' },
  saveBtnTxt: { color: '#000', fontWeight: '600', fontSize: 15 },
});
