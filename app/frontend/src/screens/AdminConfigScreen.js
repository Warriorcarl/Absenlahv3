import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const AdminConfigScreen = () => {
  const [siteName, setSiteName] = useState('');
  const [radius, setRadius] = useState('');
  const [targetUserId, setTargetUserId] = useState('');

  const handleAddGeofence = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      await axios.post(`${API_URL}/admin/geofences`, {
        site_name: siteName,
        radius_meters: parseInt(radius),
        latitude: 0, // Placeholder
        longitude: 0,
        is_active: true
      }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Success', 'Geofence added');
    } catch (error) {
      Alert.alert('Error', 'Failed to add geofence');
    }
  };

  const handleResetBinding = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      await axios.post(`${API_URL}/admin/reset-device-binding/${targetUserId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Success', 'Binding reset');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Reset failed');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Manage Geofence</Text>
      <TextInput style={styles.input} placeholder="Site Name" value={siteName} onChangeText={setSiteName} />
      <TextInput style={styles.input} placeholder="Radius (meters)" keyboardType="numeric" value={radius} onChangeText={setRadius} />
      <TouchableOpacity style={styles.saveBtn} onPress={handleAddGeofence}>
        <Text style={styles.btnText}>Add Site</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { marginTop: 40 }]}>Reset Device Binding</Text>
      <TextInput style={styles.input} placeholder="User ID" value={targetUserId} onChangeText={setTargetUserId} />
      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#F44336' }]} onPress={handleResetBinding}>
        <Text style={styles.btnText}>Reset Binding</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 8, marginBottom: 15 },
  saveBtn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default AdminConfigScreen;
