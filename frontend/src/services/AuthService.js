import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export const login = async (username, password) => {
  try {
    const hardwareId = Device.osInternalBuildId || 'fallback_id';
    console.log(`Attempting login to: ${API_URL}/auth/login`);
    const response = await axios.post(`${API_URL}/auth/login`, {
      username,
      password,
      hardware_id: hardwareId
    });
    const { access_token, role } = response.data;

    await SecureStore.setItemAsync('userToken', access_token);
    await SecureStore.setItemAsync('userRole', role || 'pekerja');
    return response.data;
  } catch (error) {
    console.error('Login Error:', error);
    if (error.response) {
       throw error.response.data?.detail || `Error ${error.response.status}: Login failed`;
    }
    throw `Server Unreachable / Network Error. URL: ${API_URL}/auth/login. Please check your internet or EXPO_PUBLIC_BACKEND_URL.`;
  }
};

export const googleLogin = async (token) => {
  try {
    const hardwareId = Device.osInternalBuildId || 'fallback_id';
    console.log(`Attempting Google login to: ${API_URL}/auth/google-login`);
    const response = await axios.post(`${API_URL}/auth/google-login?token=${token}&hardware_id=${hardwareId}`);
    const { access_token, role } = response.data;

    await SecureStore.setItemAsync('userToken', access_token);
    await SecureStore.setItemAsync('userRole', role || 'pekerja');
    return response.data;
  } catch (error) {
    console.error('Google Login Error:', error);
    if (error.response) {
       throw error.response.data?.detail || `Error ${error.response.status}: Google Login failed`;
    }
    throw `Server Unreachable / Network Error. URL: ${API_URL}/auth/google-login. Please check your internet or EXPO_PUBLIC_BACKEND_URL.`;
  }
};

export const logout = async () => {
  await SecureStore.deleteItemAsync('userToken');
};
