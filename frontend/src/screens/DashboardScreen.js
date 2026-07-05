import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import { extractErrorMessage } from '../utils/ErrorHelper';
import { checkIn, checkOut } from '../services/AttendanceService';
import { getTranslation } from '../i18n';
import CameraLiveness from '../components/CameraLiveness';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const DashboardScreen = ({ navigation }) => {
  const [lang, setLang] = useState('id');
  const [stats, setStats] = useState(null);
  const [todayLog, setTodayLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [userRole, setUserRole] = useState('pekerja');

  const fetchData = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const headers = { Authorization: `Bearer ${token}` };

      const statsRes = await axios.get(`${API_URL}/worker/stats`, { headers });
      setStats(statsRes.data);

      const historyRes = await axios.get(`${API_URL}/attendance/history`, { headers });
      const logs = historyRes.data;
      if (logs.length > 0) {
        const lastLog = logs[0];
        const logDate = new Date(lastLog.check_in_time).toDateString();
        const todayDate = new Date().toDateString();
        if (logDate === todayDate) {
          setTodayLog(lastLog);
        } else {
          setTodayLog(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCheckIn = async () => {
     setShowCamera(true);
  };

  const onLivenessVerified = async (score) => {
    setShowCamera(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Error', 'Camera permission needed');

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      try {
        await checkIn(null, false, '', result.assets[0].uri, score);
        Alert.alert('Success', 'Checked in successfully');
        fetchData();
      } catch (error) {
        Alert.alert('Error', extractErrorMessage(error));
      }
    }
  };

  const handleCheckOut = async () => {
    if (!todayLog) return;
    try {
      setLoading(true);
      await checkOut(todayLog._id);
      Alert.alert('Success', 'Checked out successfully');
      fetchData();
    } catch (error) {
      Alert.alert('Error', extractErrorMessage(error));
    } finally {
      setLoading(false);
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
      Alert.alert('Error', extractErrorMessage(error));
    }
  };

  useEffect(() => {
    fetchData();
    SecureStore.getItemAsync('userRole').then(role => {
      if (role) setUserRole(role);
    });
  }, []);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  if (showCamera) {
    return <CameraLiveness onVerified={onLivenessVerified} />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
    >
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

      {!todayLog ? (
        <TouchableOpacity style={styles.actionButton} onPress={handleCheckIn}>
          <Text style={styles.actionButtonText}>{getTranslation('check_in', lang)}</Text>
        </TouchableOpacity>
      ) : !todayLog.check_out_time ? (
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#F44336' }]} onPress={handleCheckOut}>
          <Text style={styles.actionButtonText}>{getTranslation('check_out', lang) || 'Check Out'}</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.actionButtonText}>Sudah Absen Pulang</Text>
        </View>
      )}

      {todayLog && todayLog.is_manual && !todayLog.arrival_at_warehouse_time && (
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FF9800' }]} onPress={() => handleConfirmArrival(todayLog._id)}>
          <Text style={styles.actionButtonText}>{getTranslation('arrival_confirm', lang)}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('History')}>
          <Text style={styles.menuText}>{getTranslation('history', lang)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Stats')}>
          <Text style={styles.menuText}>My Monthly Statistics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.menuText}>My Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('LeaveRequest')}>
          <Text style={styles.menuText}>{getTranslation('leave_request', lang)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('DivisionLeaves')}>
          <Text style={styles.menuText}>{getTranslation('leave_info', lang)}</Text>
        </TouchableOpacity>

        {userRole === 'supervisor' || userRole === 'admin' ? (
          <TouchableOpacity style={[styles.menuItem, {backgroundColor: '#E8F5E9'}]} onPress={() => navigation.navigate('SupervisorApproval')}>
            <Text style={[styles.menuText, {color: '#2E7D32', fontWeight: 'bold'}]}>Supervisor Approvals</Text>
          </TouchableOpacity>
        ) : null}

        {userRole === 'admin' ? (
          <TouchableOpacity style={[styles.menuItem, {backgroundColor: '#F3E5F5'}]} onPress={() => navigation.navigate('AdminConfig')}>
            <Text style={[styles.menuText, {color: '#7B1FA2', fontWeight: 'bold'}]}>Admin Configuration</Text>
          </TouchableOpacity>
        ) : null}
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
