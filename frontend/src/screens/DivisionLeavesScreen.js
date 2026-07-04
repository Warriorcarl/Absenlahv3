import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const DivisionLeavesScreen = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDivisionLeaves = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        const response = await axios.get(`${API_URL}/leaves/division-leaves`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLeaves(response.data);
      } catch (error) {
        console.error('Failed to fetch division leaves', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDivisionLeaves();
  }, []);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Division Leave Information</Text>
      <FlatList
        data={leaves}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View>
              <Text style={styles.worker}>{item.full_name || 'Coworker'}</Text>
              <Text style={styles.position}>{item.position || 'Staff'}</Text>
              <Text style={styles.date}>
                {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.statusBox}>
              <Text style={styles.status}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#007AFF' },
  item: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#fff', borderRadius: 8, marginBottom: 10, elevation: 1 },
  worker: { fontSize: 16, fontWeight: 'bold' },
  position: { color: '#007AFF', fontSize: 12, marginBottom: 5 },
  date: { color: '#666', marginTop: 5 },
  statusBox: { justifyContent: 'center' },
  status: { fontWeight: 'bold', color: '#4CAF50' }
});

export default DivisionLeavesScreen;
