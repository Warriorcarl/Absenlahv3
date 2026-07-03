import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export const login = async (username, password) => {
  try {
    const hardwareId = Device.osInternalBuildId || 'fallback_id';
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await axios.post(`${API_URL}/auth/login?hardware_id=${hardwareId}`, formData);
    const { access_token } = response.data;

    await SecureStore.setItemAsync('userToken', access_token);
    return response.data;
  } catch (error) {
    throw error.response?.data?.detail || 'Login failed';
  }
};

export const googleLogin = async (token) => {
  try {
    const hardwareId = Device.osInternalBuildId || 'fallback_id';
    const response = await axios.post(`${API_URL}/auth/google-login?token=${token}&hardware_id=${hardwareId}`);
    const { access_token } = response.data;

    await SecureStore.setItemAsync('userToken', access_token);
    return response.data;
  } catch (error) {
    throw error.response?.data?.detail || 'Google Login failed';
  }
};

export const logout = async () => {
  await SecureStore.deleteItemAsync('userToken');
};
