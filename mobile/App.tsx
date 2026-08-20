import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import VideosScreen from "./src/screens/VideosScreen";
import PoseAnalysisScreen from "./src/screens/PoseAnalysisScreen";
import BiomechanicsScreen from "./src/screens/BiomechanicsScreen";
import MovementScreen from "./src/screens/MovementScreen";
import ErrorsScreen from "./src/screens/ErrorsScreen";
import CompareScreen from "./src/screens/CompareScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import CoachPlanScreen from "./src/screens/CoachPlanScreen";
import ReportScreen from "./src/screens/ReportScreen";
import GroupsScreen from "./src/screens/GroupsScreen";
import GroupDetailScreen from "./src/screens/GroupDetailScreen";
import SubscriptionScreen from "./src/screens/SubscriptionScreen";
import { colors } from "./src/theme/colors";
import type { RootStackParamList } from "./src/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.black,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={colors.turquoise} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Videos" component={VideosScreen} />
          <Stack.Screen name="PoseAnalysis" component={PoseAnalysisScreen} />
          <Stack.Screen name="Biomechanics" component={BiomechanicsScreen} />
          <Stack.Screen name="Movement" component={MovementScreen} />
          <Stack.Screen name="Errors" component={ErrorsScreen} />
          <Stack.Screen name="Compare" component={CompareScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="CoachPlan" component={CoachPlanScreen} />
          <Stack.Screen name="Report" component={ReportScreen} />
          <Stack.Screen name="Groups" component={GroupsScreen} />
          <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
          <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
