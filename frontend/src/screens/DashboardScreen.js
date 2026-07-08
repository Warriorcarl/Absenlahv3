import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl, Dimensions } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { extractErrorMessage } from '../utils/ErrorHelper';
import { checkIn, checkOut } from '../services/AttendanceService';
import { getTranslation } from '../i18n';
import CameraLiveness from '../components/CameraLiveness';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const CARTO_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

const DashboardScreen = ({ navigation }) => {
  const mapRef = React.useRef(null);
  const [lang, setLang] = useState('id');
  const [stats, setStats] = useState(null);
  const [todayLog, setTodayLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [userRole, setUserRole] = useState('pekerja');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState(null);

  const fetchData = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const headers = { Authorization: `Bearer ${token}` };

      const statsRes = await axios.get(`${API_URL}/worker/stats`, { headers });
      setStats(statsRes.data);

      const historyRes = await axios.get(`${API_URL}/attendance/history`, { headers });
      const logs = historyRes.data;

      await updateCurrentLocation();

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

  const updateCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const newCoords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setLocation(newCoords);

      const newRegion = {
        ...newCoords,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setRegion(newRegion);

      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.error('Error fetching location:', error);
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

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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
        <View>
          <Text style={styles.welcome}>Halo, {getTranslation('worker', lang)}</Text>
          <Text style={styles.date}>{currentTime.toLocaleDateString()}</Text>
        </View>
        <View style={styles.clockContainer}>
           <Text style={styles.clockText}>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>
        </View>
      </View>

      <View style={styles.langToggle}>
        <TouchableOpacity onPress={() => setLang(lang === 'en' ? 'id' : 'en')}>
           <Text style={{color: '#007AFF', fontWeight: '600'}}>{lang === 'en' ? 'Bahasa Indonesia' : 'English'}</Text>
        </TouchableOpacity>
      </View>

      {region && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            mapType="none"
          >
            <UrlTile
              urlTemplate={CARTO_URL}
              maximumZ={19}
              flipY={false}
            />
            {location && <Marker coordinate={location} title="Your Location" pinColor="#007AFF" />}
          </MapView>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={updateCurrentLocation}
          >
            <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#1a237e" />
          </TouchableOpacity>
        </View>
      )}

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
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { padding: 25, backgroundColor: '#1a237e', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 35, borderBottomRightRadius: 35, elevation: 10, paddingTop: 60 },
  welcome: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  date: { color: '#c5cae9', marginTop: 4, fontSize: 14 },
  clockContainer: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  clockText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  langToggle: { paddingHorizontal: 25, marginTop: 20, alignItems: 'flex-end' },
  mapContainer: { margin: 20, height: 250, borderRadius: 25, overflow: 'hidden', elevation: 5, backgroundColor: '#fff', borderWidth: 2, borderColor: '#fff', position: 'relative' },
  map: { width: '100%', height: '100%' },
  locationButton: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10, justifyContent: 'space-between' },
  statBox: { backgroundColor: '#fff', padding: 22, borderRadius: 20, width: '48%', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  statLabel: { color: '#757575', fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  statValue: { fontSize: 28, fontWeight: '800', marginTop: 8, color: '#1a237e' },
  actionButton: { margin: 20, backgroundColor: '#1a237e', padding: 22, borderRadius: 20, alignItems: 'center', elevation: 6, shadowColor: '#1a237e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  actionButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold', letterSpacing: 1 },
  menuContainer: { padding: 20 },
  menuItem: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1 },
  menuText: { fontSize: 16 }
});

export default DashboardScreen;
