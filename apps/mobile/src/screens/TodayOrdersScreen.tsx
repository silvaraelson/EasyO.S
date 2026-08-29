import { useCallback, useEffect, useState } from "react";
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
import { authClient } from "../lib/auth-client";
import { PRIORITY_LABELS, STATUS_LABELS } from "../lib/labels";
import { useServiceOrders } from "../db/hooks";
import { runSync } from "../db/sync";
import { useSyncStatus } from "../db/sync-status";

type Props = NativeStackScreenProps<RootStackParamList, "TodayOrders">;

export function TodayOrdersScreen({ navigation }: Props) {
  const orders = useServiceOrders();
  const syncStatus = useSyncStatus();
  const [refreshing, setRefreshing] = useState(false);

  const sync = useCallback(async () => {
    setRefreshing(true);
    try {
      await runSync();
    } catch {
      // erro já fica registrado no syncStatus — a lista local continua utilizável
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    sync();
  }, [sync]);

  return (
    <View style={styles.container}>
      <SyncBanner status={syncStatus.status} lastSyncedAt={syncStatus.lastSyncedAt} />

      {orders.length === 0 && !refreshing && (
        <Text style={styles.muted}>Nenhuma OS em aberto pra você.</Text>
      )}

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={sync} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}
          >
            <Text style={styles.cardTitle}>OS #{item.number}</Text>
            <Text style={styles.cardMeta}>
              {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] ?? item.status} ·{" "}
              {PRIORITY_LABELS[item.priority as keyof typeof PRIORITY_LABELS] ?? item.priority}
            </Text>
            {item.scheduledAt && (
              <Text style={styles.cardMeta}>{item.scheduledAt.toLocaleString("pt-BR")}</Text>
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

function SyncBanner({
  status,
  lastSyncedAt,
}: {
  status: "idle" | "syncing" | "synced" | "error";
  lastSyncedAt: Date | null;
}) {
  if (status === "syncing") {
    return (
      <View style={[styles.syncBanner, styles.syncBannerNeutral]}>
        <Text style={styles.syncBannerText}>Sincronizando…</Text>
      </View>
    );
  }
  if (status === "error") {
    return (
      <View style={[styles.syncBanner, styles.syncBannerError]}>
        <Text style={styles.syncBannerText}>
          Sem conexão — mostrando dados salvos no aparelho
        </Text>
      </View>
    );
  }
  if (status === "synced" && lastSyncedAt) {
    return (
      <View style={[styles.syncBanner, styles.syncBannerOk]}>
        <Text style={styles.syncBannerText}>
          Sincronizado às {lastSyncedAt.toLocaleTimeString("pt-BR")}
        </Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  syncBanner: {
    paddingVertical: 6,
    alignItems: "center",
  },
  syncBannerNeutral: {
    backgroundColor: "#f2f2ee",
  },
  syncBannerOk: {
    backgroundColor: "#dcece8",
  },
  syncBannerError: {
    backgroundColor: "#f6dede",
  },
  syncBannerText: {
    fontSize: 12,
    color: "#444",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  muted: {
    padding: 16,
    color: "#666",
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
