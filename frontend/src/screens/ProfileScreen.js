import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { logout } from '../services/AuthService';

const ProfileScreen = ({ navigation }) => {
  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <Image
          source={{ uri: 'https://via.placeholder.com/150' }}
          style={styles.avatar}
        />
        <Text style={styles.name}>Pekerja Tetap</Text>
        <Text style={styles.role}>Senior Courier</Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Email</Text>
        <Text style={styles.infoValue}>pekerja@absenlah.local</Text>

        <Text style={styles.infoLabel}>Username</Text>
        <Text style={styles.infoValue}>pekerja123</Text>

        <Text style={styles.infoLabel}>Division</Text>
        <Text style={styles.infoValue}>Logistics</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 15 },
  name: { fontSize: 22, fontWeight: 'bold' },
  role: { color: '#007AFF', fontSize: 16 },
  infoSection: { marginTop: 20 },
  infoLabel: { color: '#666', fontSize: 14, marginTop: 15 },
  infoValue: { fontSize: 18, fontWeight: '500', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
  logoutBtn: { marginTop: 50, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#F44336', alignItems: 'center' },
  logoutText: { color: '#F44336', fontWeight: 'bold' }
});

export default ProfileScreen;
