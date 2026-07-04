import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const StatsScreen = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        const response = await axios.get(`${API_URL}/worker/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Monthly Statistics</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quotas Remaining</Text>
        <View style={styles.statRow}><Text>Leave Quota:</Text><Text style={styles.val}>{stats?.remaining_leave_quota}</Text></View>
        <View style={styles.statRow}><Text>Lateness Quota:</Text><Text style={styles.val}>{stats?.remaining_lateness_quota}</Text></View>
        <View style={styles.statRow}><Text>Emergency Quota:</Text><Text style={styles.val}>{stats?.remaining_emergency_quota}</Text></View>
        <View style={styles.statRow}><Text>Early Departure Quota:</Text><Text style={styles.val}>{stats?.remaining_early_departure_quota}</Text></View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Earnings</Text>
        <View style={styles.statRow}><Text>Total Overtime:</Text><Text style={styles.val}>Rp{stats?.total_overtime_earned?.toLocaleString()}</Text></View>
        <View style={styles.statRow}><Text>Discipline Bonus:</Text><Text style={styles.val}>Rp{stats?.total_bonus_disiplin?.toLocaleString()}</Text></View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Deductions</Text>
        <View style={styles.statRow}><Text>Lateness Fines:</Text><Text style={[styles.val, {color: 'red'}]}>Rp{stats?.total_lateness_fines?.toLocaleString()}</Text></View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#007AFF' },
  section: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  val: { fontWeight: 'bold', fontSize: 16 }
});

export default StatsScreen;
