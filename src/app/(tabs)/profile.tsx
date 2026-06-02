import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../hooks/use-supabase-auth';

export default function ProfileTab() {
  const { user, profile, signOut, loading } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={() => signOut()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ef4444" />
        ) : (
          <Text style={styles.logoutText}>Sign Out</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F2F2F2',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E9', // Light green background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#388E3C', // Yrdly Green
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1C',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#616161',
  },
  logoutButton: {
    height: 54,
    borderWidth: 1,
    borderColor: '#E53935',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: '#E53935',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
