import { useQuery } from "@tanstack/react-query";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { PRIORITY_LABELS, STATUS_LABELS } from "../lib/labels";

type Props = NativeStackScreenProps<RootStackParamList, "TodayOrders">;

export function TodayOrdersScreen({ navigation }: Props) {
  const {
    data: orders,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["service-orders", "mine"],
    queryFn: api.serviceOrders.mine,
  });

  return (
    <View style={styles.container}>
      {isLoading && <Text style={styles.muted}>Carregando…</Text>}
      {error && <Text style={styles.error}>{(error as Error).message}</Text>}
      {orders && orders.length === 0 && (
        <Text style={styles.muted}>Nenhuma OS em aberto pra você.</Text>
      )}

      <FlatList
        data={orders ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}
          >
            <Text style={styles.cardTitle}>OS #{item.number}</Text>
            <Text style={styles.cardMeta}>
              {STATUS_LABELS[item.status]} · {PRIORITY_LABELS[item.priority]}
            </Text>
            {item.scheduledAt && (
              <Text style={styles.cardMeta}>
                {new Date(item.scheduledAt).toLocaleString("pt-BR")}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.signOut} onPress={() => authClient.signOut()}>
        <Text style={styles.signOutText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  muted: {
    padding: 16,
    color: "#666",
  },
  error: {
    padding: 16,
    color: "#b23a3a",
  },
  card: {
    borderWidth: 1,
    borderColor: "#e0e0da",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    color: "#666",
  },
  signOut: {
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  signOutText: {
    color: "#b23a3a",
    fontWeight: "600",
  },
});
