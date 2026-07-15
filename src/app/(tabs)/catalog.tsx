import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, TouchableWithoutFeedback, ScrollView, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MarketplaceGrid } from '../../components/MarketplaceGrid';
import { EventList } from '../../components/EventList';
import { BusinessComingSoon } from '../../components/BusinessComingSoon';
import { useAppTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';

type TabType = 'Marketplace' | 'Events';
const TABS: TabType[] = ['Marketplace', 'Events'];
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function CatalogTab() {
  const { colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<TabType>('Marketplace');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortOption, setSortOption] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const insets = useSafeAreaInsets();

  const scrollViewRef = useRef<ScrollView>(null);

  const handleTabPress = (tab: TabType, index: number) => {
    setActiveTab(tab);
    scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (TABS[index] !== activeTab) {
      setActiveTab(TABS[index]);
    }
  };
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Explore" />
      {/* Search Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.borderLight }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
          <Feather name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search Yrdly..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, { backgroundColor: colors.inputBackground }]}
          onPress={() => setFilterVisible(true)}
        >
          <Feather name="sliders" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Segmented Control */}
      <View style={[styles.segmentedControl, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {TABS.map((tab, index) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton, 
                isActive && { backgroundColor: colors.tint + '1A' } // 10% opacity tint
              ]}
              onPress={() => handleTabPress(tab, index)}
            >
              <Text style={[
                styles.tabText, 
                { color: colors.textSecondary },
                isActive && { color: colors.tint }
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content Area */}
      <View style={styles.contentArea}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={{ width: SCREEN_WIDTH }}>
            <MarketplaceGrid searchQuery={searchQuery} sortOption={sortOption} />
          </View>
          <View style={{ width: SCREEN_WIDTH }}>
            <EventList searchQuery={searchQuery} sortOption={sortOption} />
          </View>

        </ScrollView>
      </View>

      {/* Filter/Sort Modal */}
      <Modal visible={filterVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setFilterVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Sort By</Text>
          
          <TouchableOpacity 
            style={styles.modalOption}
            onPress={() => { setSortOption('newest'); setFilterVisible(false); }}
          >
            <Text style={[styles.modalOptionText, { color: colors.text }]}>Newest</Text>
            {sortOption === 'newest' && <Feather name="check" size={20} color={colors.tint} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modalOption}
            onPress={() => { setSortOption('price_asc'); setFilterVisible(false); }}
          >
            <Text style={[styles.modalOptionText, { color: colors.text }]}>Price: Low to High</Text>
            {sortOption === 'price_asc' && <Feather name="check" size={20} color={colors.tint} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modalOption}
            onPress={() => { setSortOption('price_desc'); setFilterVisible(false); }}
          >
            <Text style={[styles.modalOptionText, { color: colors.text }]}>Price: High to Low</Text>
            {sortOption === 'price_desc' && <Feather name="check" size={20} color={colors.tint} />}
          </TouchableOpacity>
          

          <TouchableOpacity 
            style={[styles.closeModalButton, { backgroundColor: colors.tint }]}
            onPress={() => setFilterVisible(false)}
          >
            <Text style={styles.closeModalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contentArea: {
    flex: 1,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#33333333',
  },
  modalOptionText: {
    fontSize: 16,
  },
  closeModalButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
