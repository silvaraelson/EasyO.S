import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GeoPoint } from "@easy-os/schemas";
import type { RootStackParamList } from "../navigation";
import { api } from "../lib/api";
import { PRIORITY_LABELS, STATUS_LABELS } from "../lib/labels";

type Props = NativeStackScreenProps<RootStackParamList, "OrderDetail">;

async function getLocation(): Promise<GeoPoint | undefined> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return undefined;
  const position = await Location.getCurrentPositionAsync({});
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

export function OrderDetailScreen({ route }: Props) {
  const { orderId } = route.params;
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["service-orders", orderId],
    queryFn: () => api.serviceOrders.get(orderId),
  });

  const { data: serviceType } = useQuery({
    queryKey: ["service-types"],
    queryFn: api.serviceTypes.list,
    select: (types) => types.find((type) => type.id === order?.serviceTypeId),
    enabled: Boolean(order),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["service-orders", orderId] });
    queryClient.invalidateQueries({ queryKey: ["service-orders", "mine"] });
  }

  const checkInMutation = useMutation({
    mutationFn: async () => api.serviceOrders.checkIn(orderId, { location: await getLocation() }),
    onSuccess: invalidate,
    onError: (err) => Alert.alert("Erro no check-in", (err as Error).message),
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => api.serviceOrders.checkOut(orderId, { location: await getLocation() }),
    onSuccess: invalidate,
    onError: (err) => Alert.alert("Erro no check-out", (err as Error).message),
  });

  const checklistMutation = useMutation({
    mutationFn: (results: Record<string, boolean>) =>
      api.serviceOrders.updateChecklist(orderId, results),
    onSuccess: invalidate,
    onError: (err) => Alert.alert("Erro ao salvar checklist", (err as Error).message),
  });

  const attachmentMutation = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error("Permissão de câmera negada");

      const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 });
      const asset = result.assets?.[0];
      if (result.canceled || !asset?.base64) return;

      const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
      await api.serviceOrders.addAttachment(orderId, { kind: "photo", dataUrl });
    },
    onSuccess: invalidate,
    onError: (err) => Alert.alert("Erro ao anexar foto", (err as Error).message),
  });

  function toggleChecklistItem(itemId: string, value: boolean) {
    if (!order) return;
    checklistMutation.mutate({ ...order.checklistResults, [itemId]: value });
  }

  if (isLoading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const canCheckIn = order.status === "scheduled";
  const canCheckOut = order.status === "in_progress" || order.status === "paused";
  const photos = order.attachments.filter((attachment) => attachment.kind === "photo");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>OS #{order.number}</Text>
      <Text style={styles.meta}>
        {STATUS_LABELS[order.status]} · {PRIORITY_LABELS[order.priority]}
      </Text>
      {order.description && <Text style={styles.description}>{order.description}</Text>}

      {canCheckIn && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => checkInMutation.mutate()}
          disabled={checkInMutation.isPending}
        >
          <Text style={styles.buttonText}>
            {checkInMutation.isPending ? "Fazendo check-in…" : "Check-in"}
          </Text>
        </TouchableOpacity>
      )}

      {serviceType && serviceType.checklist.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Checklist</Text>
          {serviceType.checklist.map((item) => (
            <View key={item.id} style={styles.checklistRow}>
              <Text style={styles.checklistLabel}>{item.label}</Text>
              <Switch
                value={Boolean(order.checklistResults[item.id])}
                onValueChange={(value) => toggleChecklistItem(item.id, value)}
              />
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fotos</Text>
        {photos.length > 0 && (
          <View style={styles.photoRow}>
            {photos.map((attachment) => (
              <Image key={attachment.id} source={{ uri: attachment.url }} style={styles.photo} />
            ))}
          </View>
        )}
        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={() => attachmentMutation.mutate()}
          disabled={attachmentMutation.isPending}
        >
          <Text style={styles.buttonSecondaryText}>
            {attachmentMutation.isPending ? "Enviando…" : "Tirar foto"}
          </Text>
        </TouchableOpacity>
      </View>

      {canCheckOut && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => checkOutMutation.mutate()}
          disabled={checkOutMutation.isPending}
        >
          <Text style={styles.buttonText}>
            {checkOutMutation.isPending ? "Fazendo check-out…" : "Concluir (check-out)"}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  meta: {
    fontSize: 14,
    color: "#666",
  },
  description: {
    fontSize: 15,
    marginTop: 8,
  },
  button: {
    backgroundColor: "#1d6e67",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: "#1d6e67",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 12,
  },
  buttonSecondaryText: {
    color: "#1d6e67",
    fontWeight: "600",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  checklistLabel: {
    fontSize: 15,
    flex: 1,
    marginRight: 12,
  },
  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  photo: {
    width: 88,
    height: 88,
    borderRadius: 8,
  },
});
