import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Camera } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';

export default function CameraLiveness({ onVerified }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [step, setStep] = useState(1); // 1: Blink, 2: Smile, 3: Success

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleFacesDetected = ({ faces }) => {
    if (faces.length === 0) return;
    const face = faces[0];

    if (step === 1) {
      // Blink detection: Probability of eyes being open is low
      if (face.leftEyeOpenProbability < 0.3 && face.rightEyeOpenProbability < 0.3) {
        setStep(2);
      }
    } else if (step === 2) {
      // Smile detection: Smiling probability is high
      if (face.smilingProbability > 0.7) {
        onVerified(0.95);
      }
    }
  };

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>No access to camera</Text>;

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={Camera.Constants.Type.front}
        onFacesDetected={handleFacesDetected}
        faceDetectorSettings={{
          mode: FaceDetector.FaceDetectorMode.fast,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
          runClassifications: FaceDetector.FaceDetectorClassifications.all,
          minDetectionInterval: 100,
          tracking: true,
        }}
      >
        <View style={styles.overlay}>
          <Text style={styles.text}>
            {step === 1 ? 'Step 1: Please Blink' : 'Step 2: Please Smile'}
          </Text>
        </View>
      </Camera>
      <View style={styles.info}>
        <Text style={styles.infoText}>Detecting... Follow prompts</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  text: { color: 'white', fontSize: 22, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.6)', padding: 15, borderRadius: 12 },
  info: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#007AFF', padding: 15, borderRadius: 20 },
  infoText: { color: 'white', fontWeight: '600' }
});
