import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceGrid } from '../../components/MarketplaceGrid';
import { EventList } from '../../components/EventList';
import { useAppTheme } from '../../context/ThemeContext';

type TabType = 'Marketplace' | 'Events' | 'Businesses';

export default function CatalogTab() {
  const { colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<TabType>('Marketplace');
  const [searchQuery, setSearchQuery] = useState('');

  const renderContent = () => {
    switch (activeTab) {
      case 'Marketplace':
        return <MarketplaceGrid searchQuery={searchQuery} />;
      case 'Events':
        return <EventList searchQuery={searchQuery} />;
      case 'Businesses':
        return (
          <View style={styles.placeholderContainer}>
            <Ionicons name="business-outline" size={48} color="#BDBDBD" />
            <Text style={styles.placeholderText}>Businesses List goes here</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#616161" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Yrdly..."
            placeholderTextColor="#9E9E9E"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color="#1C1C1C" />
        </TouchableOpacity>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentedControl}>
        {(['Marketplace', 'Events', 'Businesses'] as TabType[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content Area */}
      <View style={styles.contentArea}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
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
    color: '#1C1C1C',
    height: '100%',
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: '#E8F5E9', // Light green bg for active tab
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#616161',
  },
  activeTabText: {
    color: '#388E3C', // Yrdly Green
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
    color: '#9E9E9E',
    fontWeight: '500',
  },
});
