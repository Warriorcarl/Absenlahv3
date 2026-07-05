import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SupervisorApprovalScreen from './src/screens/SupervisorApprovalScreen';
import AdminConfigScreen from './src/screens/AdminConfigScreen';
import LeaveRequestScreen from './src/screens/LeaveRequestScreen';
import DivisionLeavesScreen from './src/screens/DivisionLeavesScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import StatsScreen from './src/screens/StatsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import * as SecureStore from 'expo-secure-store';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        setUserToken(token);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    checkToken();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={userToken ? "Dashboard" : "Login"}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Absenlah Dashboard' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'My History' }} />
        <Stack.Screen name="SupervisorApproval" component={SupervisorApprovalScreen} options={{ title: 'Pending Approvals' }} />
        <Stack.Screen name="AdminConfig" component={AdminConfigScreen} options={{ title: 'Admin Config' }} />
        <Stack.Screen name="LeaveRequest" component={LeaveRequestScreen} options={{ title: 'Request Leave' }} />
        <Stack.Screen name="DivisionLeaves" component={DivisionLeavesScreen} options={{ title: 'Leave Info Center' }} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
        <Stack.Screen name="Stats" component={StatsScreen} options={{ title: 'My Statistics' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
