import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Camera } from 'expo-camera';

export default function CameraLiveness({ onVerified }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [step, setStep] = useState(1); // 1: Blink, 2: Smile, 3: Success

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleAction = () => {
    if (step === 1) setStep(2);
    else if (step === 2) onVerified(0.9);
  };

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>No access to camera</Text>;

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} type={Camera.Constants.Type.front}>
        <View style={styles.overlay}>
          <Text style={styles.text}>
            {step === 1 ? 'Step 1: Please Blink' : 'Step 2: Please Smile'}
          </Text>
        </View>
      </Camera>
      <TouchableOpacity style={styles.capture} onPress={handleAction}>
        <Text style={styles.captureText}>
          {step === 1 ? 'I Blinked' : 'I Smiled'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  text: { color: 'white', fontSize: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 8 },
  capture: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#007AFF', padding: 20, borderRadius: 12 },
  captureText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});
