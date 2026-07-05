import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import { extractErrorMessage } from '../utils/ErrorHelper';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const AdminConfigScreen = () => {
  const [summary, setSummary] = useState(null);
  const [siteName, setSiteName] = useState('');
  const [radius, setRadius] = useState('');
  const [coords, setCoords] = useState(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [configs, setConfigs] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchConfigs();
    fetchUsers();
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await axios.get(`${API_URL}/admin/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await axios.get(`${API_URL}/admin/users?search=${search}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users || []);
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
      Alert.alert('Error', extractErrorMessage(error));
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
      Alert.alert('Error', extractErrorMessage(error));
    }
  };

  const handleResetBinding = async (userId) => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      await axios.post(`${API_URL}/admin/reset-device-binding/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Success', 'Binding reset');
      fetchUsers();
    } catch (error) {
      Alert.alert('Error', extractErrorMessage(error));
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Daily Summary</Text>
      {summary && (
        <View style={styles.statsContainer}>
           <View style={styles.statBox}>
             <Text style={styles.statLabel}>Late Today</Text>
             <Text style={styles.statValue}>{summary.late_today}</Text>
           </View>
           <View style={styles.statBox}>
             <Text style={styles.statLabel}>On Leave</Text>
             <Text style={styles.statValue}>{summary.on_leave}</Text>
           </View>
        </View>
      )}

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

      <Text style={[styles.sectionTitle, { marginTop: 40 }]}>Reports</Text>
      <View style={styles.statsContainer}>
        <TouchableOpacity style={[styles.saveBtn, { width: '48%', backgroundColor: '#4CAF50' }]} onPress={() => Alert.alert('Export', 'CSV Export Started')}>
          <Text style={styles.btnText}>Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.saveBtn, { width: '48%', backgroundColor: '#F44336' }]} onPress={() => Alert.alert('Export', 'PDF Export Started')}>
          <Text style={styles.btnText}>Export PDF</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 40 }]}>Reset Device Binding</Text>
      <TextInput
        style={styles.input}
        placeholder="Search worker..."
        value={search}
        onChangeText={setSearch}
        onEndEditing={fetchUsers}
      />
      {users.map(u => (
        <View key={u._id} style={styles.configItem}>
          <Text style={styles.configLabel}>{u.username} ({u.is_hardware_bound ? 'Bound' : 'Free'})</Text>
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: u.is_hardware_bound ? '#F44336' : '#ccc' }]}
            onPress={() => handleResetBinding(u._id)}
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
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  statBox: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 8, width: '48%', alignItems: 'center' },
  statLabel: { color: '#666', fontSize: 12 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#F44336' },
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
