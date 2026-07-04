import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const AdminConfigScreen = () => {
  const [siteName, setSiteName] = useState('');
  const [radius, setRadius] = useState('');
  const [coords, setCoords] = useState(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [configs, setConfigs] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchConfigs();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const fetchConfigs = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await axios.get(`${API_URL}/admin/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfigs(response.data);
    } catch (error) {
      console.error('Failed to fetch configs', error);
    }
  };

  const handleUpdateConfig = async (key, value) => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      await axios.post(`${API_URL}/admin/config`, { key, value }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Success', `${key} updated`);
      fetchConfigs();
    } catch (error) {
      Alert.alert('Error', 'Update failed');
    }
  };

  const fetchCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied');
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
    setCoords(location.coords);
    Alert.alert('Location Fetched', `Lat: ${location.coords.latitude}, Lon: ${location.coords.longitude}`);
  };

  const handleAddGeofence = async () => {
    if (!coords) return Alert.alert('Error', 'Fetch location first');
    try {
      const token = await SecureStore.getItemAsync('userToken');
      await axios.post(`${API_URL}/admin/geofences`, {
        site_name: siteName,
        radius_meters: parseInt(radius),
        latitude: coords.latitude,
        longitude: coords.longitude,
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
      <Text style={styles.sectionTitle}>Rules Engine (Live Config)</Text>
      {configs.map(cfg => (
        <View key={cfg.key} style={styles.configItem}>
          <Text style={styles.configLabel}>{cfg.key}</Text>
          <TextInput
            style={styles.configInput}
            defaultValue={String(cfg.value)}
            onEndEditing={(e) => handleUpdateConfig(cfg.key, e.nativeEvent.text)}
          />
        </View>
      ))}

      <Text style={[styles.sectionTitle, { marginTop: 40 }]}>Manage Geofence</Text>
      <TextInput style={styles.input} placeholder="Site Name" value={siteName} onChangeText={setSiteName} />
      <TextInput style={styles.input} placeholder="Radius (meters)" keyboardType="numeric" value={radius} onChangeText={setRadius} />
      <TouchableOpacity style={styles.locationBtn} onPress={fetchCurrentLocation}>
        <Text style={styles.btnText}>Use Current Location</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.saveBtn} onPress={handleAddGeofence}>
        <Text style={styles.btnText}>Add Site</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { marginTop: 40 }]}>Reset Device Binding</Text>
      {users.map(u => (
        <View key={u._id} style={styles.configItem}>
          <Text style={styles.configLabel}>{u.username} ({u.is_hardware_bound ? 'Bound' : 'Free'})</Text>
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: u.is_hardware_bound ? '#F44336' : '#ccc' }]}
            onPress={() => { setTargetUserId(u._id); handleResetBinding(); }}
            disabled={!u.is_hardware_bound}
          >
            <Text style={styles.smallBtnText}>Reset</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#007AFF' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 8, marginBottom: 15 },
  configItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 8 },
  configLabel: { flex: 1, fontWeight: '600' },
  configInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 5, textAlign: 'right' },
  locationBtn: { backgroundColor: '#FF9800', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  saveBtn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  smallBtn: { padding: 8, borderRadius: 4, minWidth: 60, alignItems: 'center' },
  smallBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 }
});

export default AdminConfigScreen;
