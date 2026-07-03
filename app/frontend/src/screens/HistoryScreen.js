import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const HistoryScreen = () => {
  const dummyData = [
    { id: '1', date: '2023-10-26', status: 'Approved', in: '10:00', out: '20:00' },
    { id: '2', date: '2023-10-25', status: 'Late', in: '10:15', out: '20:00' },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={dummyData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View>
              <Text style={styles.date}>{item.date}</Text>
              <Text style={styles.time}>{item.in} - {item.out}</Text>
            </View>
            <Text style={[styles.status, { color: item.status === 'Late' ? 'red' : 'green' }]}>
              {item.status}
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  item: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  date: { fontSize: 16, fontWeight: 'bold' },
  time: { color: '#666', marginTop: 5 },
  status: { fontWeight: 'bold' }
});

export default HistoryScreen;
