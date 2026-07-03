import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SupervisorApprovalScreen from './src/screens/SupervisorApprovalScreen';
import AdminConfigScreen from './src/screens/AdminConfigScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Absenlah Dashboard' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'My History' }} />
        <Stack.Screen name="SupervisorApproval" component={SupervisorApprovalScreen} options={{ title: 'Pending Approvals' }} />
        <Stack.Screen name="AdminConfig" component={AdminConfigScreen} options={{ title: 'Admin Config' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
