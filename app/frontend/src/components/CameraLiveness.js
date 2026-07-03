import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Camera } from 'expo-camera';

export default function CameraLiveness({ onVerified }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState(Camera.Constants.Type.front);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>No access to camera</Text>;

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} type={type}>
        <View style={styles.overlay}>
          <Text style={styles.text}>Please Blink or Smile</Text>
        </View>
      </Camera>
      <TouchableOpacity style={styles.capture} onPress={() => onVerified(0.9)}>
        <Text style={styles.captureText}>Verify Liveness</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  text: { color: 'white', fontSize: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10 },
  capture: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#007AFF', padding: 20, borderRadius: 12 },
  captureText: { color: 'white', fontWeight: 'bold' }
});
