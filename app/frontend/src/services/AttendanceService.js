import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const getAuthHeader = async () => {
  const token = await SecureStore.getItemAsync('userToken');
  return { Authorization: `Bearer ${token}` };
};

export const checkIn = async (geofenceId, isManual = false, manualReason = '') => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw 'Location permission denied';

    const location = await Location.getCurrentPositionAsync({});
    const headers = await getAuthHeader();

    const response = await axios.post(`${API_URL}/attendance/check-in?liveness_score=0.9`, {
      check_in_lat: location.coords.latitude,
      check_in_long: location.coords.longitude,
      geofence_id: geofenceId,
      is_manual: isManual,
      manual_reason: manualReason,
      check_in_time: new Date().toISOString()
    }, { headers });

    return response.data;
  } catch (error) {
    throw error.response?.data?.detail || error.message || 'Check-in failed';
  }
};

export const checkOut = async (logId) => {
  try {
    const location = await Location.getCurrentPositionAsync({});
    const headers = await getAuthHeader();

    const response = await axios.post(`${API_URL}/attendance/check-out/${logId}`, {
      check_out_lat: location.coords.latitude,
      check_out_long: location.coords.longitude,
      check_out_time: new Date().toISOString()
    }, { headers });

    return response.data;
  } catch (error) {
    throw error.response?.data?.detail || 'Check-out failed';
  }
};
