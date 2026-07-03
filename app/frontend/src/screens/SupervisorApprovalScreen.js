import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

const SupervisorApprovalScreen = () => {
  const pendingLogs = [
    { id: '1', user: 'Worker A', reason: 'Late (10:15)', type: 'Lateness' },
    { id: '2', user: 'Worker B', reason: 'Emergency Manual', type: 'Attendance' },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={pendingLogs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.user}>{item.user}</Text>
            <Text style={styles.reason}>{item.reason}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btn, styles.approveBtn]}>
                <Text style={styles.btnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.rejectBtn]}>
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 10 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 10, elevation: 2 },
  user: { fontSize: 18, fontWeight: 'bold' },
  reason: { color: '#666', marginVertical: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  btn: { padding: 10, borderRadius: 6, marginLeft: 10, width: 100, alignItems: 'center' },
  approveBtn: { backgroundColor: '#4CAF50' },
  rejectBtn: { backgroundColor: '#F44336' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});

export default SupervisorApprovalScreen;
