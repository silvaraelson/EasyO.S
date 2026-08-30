import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { queryClient } from "./src/lib/query-client";
import { authClient } from "./src/lib/auth-client";
import { api } from "./src/lib/api";
import { registerForPushNotifications } from "./src/lib/push-notifications";
import { LoginScreen } from "./src/screens/LoginScreen";
import { TodayOrdersScreen } from "./src/screens/TodayOrdersScreen";
import { OrderDetailScreen } from "./src/screens/OrderDetailScreen";
import type { RootStackParamList } from "./src/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!session) return;
    registerForPushNotifications()
      .then((token) => {
        if (token) return api.users.savePushToken(token);
      })
      .catch(() => {
        // notificação é um bônus — não deve travar o login se falhar
      });
  }, [session]);

  if (isPending) {
    return <View style={{ flex: 1, backgroundColor: "#fff" }} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator>
            {session ? (
              <>
                <Stack.Screen
                  name="TodayOrders"
                  component={TodayOrdersScreen}
                  options={{ title: "Minhas OS" }}
                />
                <Stack.Screen
                  name="OrderDetail"
                  component={OrderDetailScreen}
                  options={{ title: "Ordem de Serviço" }}
                />
              </>
            ) : (
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
