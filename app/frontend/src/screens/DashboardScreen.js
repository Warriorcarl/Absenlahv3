import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

const DashboardScreen = ({ navigation }) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome, Pekerja</Text>
        <Text style={styles.date}>{new Date().toDateString()}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Leave Quota</Text>
          <Text style={styles.statValue}>12</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Late Quota</Text>
          <Text style={styles.statValue}>2</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.actionButton}>
        <Text style={styles.actionButtonText}>Check-in Now</Text>
      </TouchableOpacity>

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('History')}>
          <Text style={styles.menuText}>My History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Request Leave</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  welcome: { fontSize: 24, fontWeight: 'bold' },
  date: { color: '#666', marginTop: 5 },
  statsContainer: { flexDirection: 'row', padding: 20, justifyContent: 'space-between' },
  statBox: { backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '48%', elevation: 2 },
  statLabel: { color: '#666', fontSize: 14 },
  statValue: { fontSize: 24, fontWeight: 'bold', marginTop: 5, color: '#007AFF' },
  actionButton: { margin: 20, backgroundColor: '#007AFF', padding: 20, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  menuContainer: { padding: 20 },
  menuItem: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1 },
  menuText: { fontSize: 16 }
});

export default DashboardScreen;
