import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import { checkIn } from '../services/AttendanceService';
import { getTranslation } from '../i18n';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const DashboardScreen = ({ navigation }) => {
  const [lang, setLang] = useState('id');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleCheckIn = async () => {
    // Check if manual is needed for demo
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Error', 'Camera permission needed');

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      try {
        await checkIn(null, false, '', result.assets[0].uri);
        Alert.alert('Success', 'Checked in successfully with photo');
        fetchStats();
      } catch (error) {
        Alert.alert('Error', error);
      }
    }
  };

  const handleConfirmArrival = async (logId) => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      await axios.post(`${API_URL}/attendance/confirm-arrival/${logId}?arrival_time=${new Date().toISOString()}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Success', 'Arrival confirmed');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Confirmation failed');
    }
  };

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
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome, {getTranslation('worker', lang)}</Text>
        <Text style={styles.date}>{new Date().toDateString()}</Text>
        <TouchableOpacity onPress={() => setLang(lang === 'en' ? 'id' : 'en')}>
           <Text style={{color: '#007AFF'}}>Switch to {lang === 'en' ? 'Indonesian' : 'English'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{getTranslation('leave_quota', lang)}</Text>
          <Text style={styles.statValue}>{stats?.remaining_leave_quota ?? 0}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{getTranslation('late_quota', lang)}</Text>
          <Text style={styles.statValue}>{stats?.remaining_lateness_quota ?? 0}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.actionButton} onPress={handleCheckIn}>
        <Text style={styles.actionButtonText}>{getTranslation('check_in', lang)}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FF9800' }]} onPress={() => handleConfirmArrival('latest')}>
        <Text style={styles.actionButtonText}>{getTranslation('arrival_confirm', lang)}</Text>
      </TouchableOpacity>

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('History')}>
          <Text style={styles.menuText}>{getTranslation('history', lang)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('LeaveRequest')}>
          <Text style={styles.menuText}>{getTranslation('leave_request', lang)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('DivisionLeaves')}>
          <Text style={styles.menuText}>{getTranslation('leave_info', lang)}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  welcome: { fontSize: 24, fontWeight: 'bold' },
  date: { color: '#666', marginTop: 5 },
  statsContainer: { flexDirection: 'row', padding: 20, justifyContent: 'space-between' },
  statBox: { backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '48%', elevation: 2 },
  statLabel: { color: '#666', fontSize: 14 },
  statValue: { fontSize: 24, fontWeight: 'bold', marginTop: 5, color: '#007AFF' },
  actionButton: { margin: 20, backgroundColor: '#007AFF', padding: 20, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  menuContainer: { padding: 20 },
  menuItem: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1 },
  menuText: { fontSize: 16 }
});

export default DashboardScreen;
