import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const SupervisorApprovalScreen = () => {
  const [pendingLogs, setPendingLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await axios.get(`${API_URL}/supervisor/pending-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingLogs(response.data);
    } catch (error) {
      console.error('Fetch error', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleAction = async (logId, category) => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      await axios.post(`${API_URL}/supervisor/approve-lateness/${logId}?category=${category}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Success', 'Log processed successfully');
      fetchPending();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Action failed');
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={pendingLogs}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.user}>{item.full_name || 'Worker'}</Text>
            <Text style={styles.reason}>Late: {item.lateness_mins} mins</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleAction(item._id, 'quota')} style={[styles.btn, styles.approveBtn]}>
                <Text style={styles.btnText}>Use Quota</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAction(item._id, 'leave')} style={[styles.btn, styles.rejectBtn]}>
                <Text style={styles.btnText}>Potong Libur</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 10 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 10, elevation: 2 },
  user: { fontSize: 18, fontWeight: 'bold' },
  reason: { color: '#666', marginVertical: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  btn: { padding: 10, borderRadius: 6, marginLeft: 10, minWidth: 100, alignItems: 'center' },
  approveBtn: { backgroundColor: '#4CAF50' },
  rejectBtn: { backgroundColor: '#FF9800' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});

export default SupervisorApprovalScreen;
