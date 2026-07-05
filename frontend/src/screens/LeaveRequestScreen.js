import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { extractErrorMessage } from '../utils/ErrorHelper';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const LeaveRequestScreen = ({ navigation }) => {
  const [reason, setReason] = useState('');
  const [type, setType] = useState('annual');

  const handleSubmit = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      await axios.post(`${API_URL}/leaves/request`, {
        leave_type: type,
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(), // Simplified for demo
        reason: reason
      }, { headers: { Authorization: `Bearer ${token}` } });

      Alert.alert('Success', 'Leave request submitted');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', extractErrorMessage(error));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Reason for Leave</Text>
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={4}
        value={reason}
        onChangeText={setReason}
        placeholder="e.g., Family emergency, sick"
      />

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
        <Text style={styles.btnText}>Submit Request</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  label: { fontSize: 18, marginBottom: 10, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 15, textAlignVertical: 'top', marginBottom: 20 },
  submitBtn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default LeaveRequestScreen;
