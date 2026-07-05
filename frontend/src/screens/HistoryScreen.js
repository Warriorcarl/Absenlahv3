import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Calendar } from 'react-native-calendars';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const HistoryScreen = () => {
  const [history, setHistory] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        const response = await axios.get(`${API_URL}/attendance/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHistory(response.data);

        // Generate marked dates for calendar
        const marked = {};
        response.data.forEach(log => {
          const dateStr = new Date(log.check_in_time).toISOString().split('T')[0];
          marked[dateStr] = {
            selected: true,
            selectedColor: log.status === 'approved' ? '#4CAF50' : '#FF9800'
          };
        });
        setMarkedDates(marked);
      } catch (error) {
        console.error('Failed to fetch history', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Calendar
        markedDates={markedDates}
        theme={{
          todayTextColor: '#007AFF',
          arrowColor: '#007AFF',
        }}
        style={styles.calendar}
      />
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>Recent Logs</Text>
      </View>
      <FlatList
        data={history}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View>
              <Text style={styles.date}>{new Date(item.check_in_time).toLocaleDateString()}</Text>
              <Text style={styles.time}>
                In: {new Date(item.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {item.check_out_time ? ` - Out: ${new Date(item.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
              </Text>
            </View>
            <Text style={[styles.status, { color: item.status === 'approved' ? 'green' : 'orange' }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  calendar: { marginBottom: 10, elevation: 2 },
  listHeader: { padding: 15, backgroundColor: '#eee' },
  listHeaderText: { fontWeight: 'bold', color: '#555' },
  item: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  date: { fontSize: 16, fontWeight: 'bold' },
  time: { color: '#666', marginTop: 5 },
  status: { fontWeight: 'bold' }
});

export default HistoryScreen;
