import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const AdminConfigScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Manage Geofence</Text>
      <TextInput style={styles.input} placeholder="Site Name" />
      <TextInput style={styles.input} placeholder="Radius (meters)" keyboardType="numeric" />
      <TouchableOpacity style={styles.saveBtn}>
        <Text style={styles.btnText}>Add Site</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { marginTop: 40 }]}>Reset Device Binding</Text>
      <TextInput style={styles.input} placeholder="Worker Username" />
      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#F44336' }]}>
        <Text style={styles.btnText}>Reset Binding</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 8, marginBottom: 15 },
  saveBtn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default AdminConfigScreen;
