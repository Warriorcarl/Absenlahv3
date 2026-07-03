import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { login } from '../services/AuthService';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await login(username, password);
      navigation.replace('Dashboard');
    } catch (error) {
      Alert.alert('Login Error', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Absenlah</Text>
      <TextInput
        style={styles.input}
        placeholder="Username or Email"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.googleButton}>
        <Text style={styles.googleButtonText}>Sign in with Google</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 40, color: '#007AFF' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 8, marginBottom: 15 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  googleButton: { marginTop: 20, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  googleButtonText: { color: '#555', fontSize: 16 }
});

export default LoginScreen;
