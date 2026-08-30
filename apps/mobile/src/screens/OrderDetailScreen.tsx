import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
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
import { database } from "../db/database";
import { useServiceOrder } from "../db/hooks";
import { runSync } from "../db/sync";

type Props = NativeStackScreenProps<RootStackParamList, "OrderDetail">;

async function getLocation(): Promise<GeoPoint | undefined> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return undefined;
  const position = await Location.getCurrentPositionAsync({});
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

/** Salva local (instantâneo, funciona offline) e tenta sincronizar em seguida. */
function syncInBackground() {
  runSync().catch(() => {
    // sem conexão — a mudança fica na fila local e vai na próxima sincronização
  });
}

export function OrderDetailScreen({ route }: Props) {
  const { orderId } = route.params;
  const order = useServiceOrder(orderId);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"check-in" | "check-out" | "photo" | null>(null);

  const { data: serviceType } = useQuery({
    queryKey: ["service-types"],
    queryFn: api.serviceTypes.list,
    select: (types) => types.find((type) => type.id === order?.serviceTypeId),
    enabled: Boolean(order),
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["service-orders", orderId, "detail"],
    queryFn: () => api.serviceOrders.get(orderId),
    select: (detail) => detail.attachments.filter((attachment) => attachment.kind === "photo"),
  });

  const { data: materialsUsed = [] } = useQuery({
    queryKey: ["service-orders", orderId, "detail"],
    queryFn: () => api.serviceOrders.get(orderId),
    select: (detail) => detail.materialsUsed,
  });

  const { data: remoteTechnicalReport } = useQuery({
    queryKey: ["service-orders", orderId, "detail"],
    queryFn: () => api.serviceOrders.get(orderId),
    select: (detail) => detail.technicalReport,
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: api.materials.list,
  });

  const [materialId, setMaterialId] = useState<string | null>(null);
  const [materialQuantity, setMaterialQuantity] = useState("1");
  const [addingMaterial, setAddingMaterial] = useState(false);

  const [technicalReport, setTechnicalReport] = useState("");
  const [savingReport, setSavingReport] = useState(false);

  useEffect(() => {
    setTechnicalReport(remoteTechnicalReport ?? "");
  }, [remoteTechnicalReport]);

  function invalidateDetail() {
    queryClient.invalidateQueries({ queryKey: ["service-orders", orderId, "detail"] });
  }

  async function handleAddMaterial() {
    if (!materialId) return;
    const quantity = Number(materialQuantity);
    if (!quantity || quantity <= 0) return;

    setAddingMaterial(true);
    try {
      await api.finance.addMaterialUsage(orderId, materialId, quantity);
      invalidateDetail();
      setMaterialId(null);
      setMaterialQuantity("1");
    } catch (error) {
      Alert.alert("Erro ao lançar material", (error as Error).message);
    } finally {
      setAddingMaterial(false);
    }
  }

  async function handleSaveReport() {
    if (!technicalReport.trim()) return;
    setSavingReport(true);
    try {
      await api.serviceOrders.updateTechnicalReport(orderId, technicalReport);
      invalidateDetail();
    } catch (error) {
      Alert.alert("Erro ao salvar relato", (error as Error).message);
    } finally {
      setSavingReport(false);
    }
  }

  async function handleCheckIn() {
    if (!order) return;
    setBusy("check-in");
    try {
      const location = await getLocation();
      await database.write(async () => {
        await order.update((record) => {
          record.status = "in_progress";
          record.checkInAt = new Date();
          if (location) {
            record.checkInLatitude = location.latitude;
            record.checkInLongitude = location.longitude;
          }
        });
      });
      syncInBackground();
    } catch (error) {
      Alert.alert("Erro no check-in", (error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleCheckOut() {
    if (!order) return;
    setBusy("check-out");
    try {
      const location = await getLocation();
      await database.write(async () => {
        await order.update((record) => {
          record.status = "completed";
          record.checkOutAt = new Date();
          if (location) {
            record.checkOutLatitude = location.latitude;
            record.checkOutLongitude = location.longitude;
          }
        });
      });
      syncInBackground();
    } catch (error) {
      Alert.alert("Erro no check-out", (error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function toggleChecklistItem(itemId: string, value: boolean) {
    if (!order) return;
    await database.write(async () => {
      await order.update((record) => {
        record.checklistResults = { ...record.checklistResults, [itemId]: value };
      });
    });
    syncInBackground();
  }

  async function handleTakePhoto() {
    if (!order) return;
    setBusy("photo");
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error("Permissão de câmera negada");

      const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 });
      const asset = result.assets?.[0];
      if (result.canceled || !asset?.base64) return;

      const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
      await api.serviceOrders.addAttachment(order.id, { kind: "photo", dataUrl });
      queryClient.invalidateQueries({ queryKey: ["service-orders", orderId, "attachments"] });
    } catch (error) {
      Alert.alert(
        "Erro ao anexar foto",
        `${(error as Error).message} — fotos exigem conexão, tente de novo quando tiver sinal.`,
      );
    } finally {
      setBusy(null);
    }
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const canCheckIn = order.status === "scheduled";
  const canCheckOut = order.status === "in_progress" || order.status === "paused";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>OS #{order.number}</Text>
      <Text style={styles.meta}>
        {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ?? order.status} ·{" "}
        {PRIORITY_LABELS[order.priority as keyof typeof PRIORITY_LABELS] ?? order.priority}
      </Text>
      {order.description && <Text style={styles.description}>{order.description}</Text>}

      {canCheckIn && (
        <TouchableOpacity style={styles.button} onPress={handleCheckIn} disabled={busy === "check-in"}>
          <Text style={styles.buttonText}>
            {busy === "check-in" ? "Fazendo check-in…" : "Check-in"}
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
        <TouchableOpacity style={styles.buttonSecondary} onPress={handleTakePhoto} disabled={busy === "photo"}>
          <Text style={styles.buttonSecondaryText}>
            {busy === "photo" ? "Enviando…" : "Tirar foto"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Materiais usados</Text>
        {materialsUsed.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            {materialsUsed.map((item) => {
              const material = materials.find((m) => m.id === item.materialId);
              return (
                <Text key={item.id} style={styles.checklistLabel}>
                  {item.quantity}× {material?.description ?? "Material"}
                </Text>
              );
            })}
          </View>
        )}
        <View style={styles.chipRow}>
          {materials.map((material) => (
            <TouchableOpacity
              key={material.id}
              style={[styles.chip, materialId === material.id && styles.chipSelected]}
              onPress={() => setMaterialId(material.id)}
            >
              <Text
                style={[styles.chipText, materialId === material.id && styles.chipTextSelected]}
              >
                {material.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {materialId && (
          <View style={styles.materialAddRow}>
            <TextInput
              style={styles.quantityInput}
              keyboardType="numeric"
              value={materialQuantity}
              onChangeText={setMaterialQuantity}
            />
            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={handleAddMaterial}
              disabled={addingMaterial}
            >
              <Text style={styles.buttonSecondaryText}>
                {addingMaterial ? "Lançando…" : "Adicionar"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Relato</Text>
        <TextInput
          style={styles.reportInput}
          multiline
          numberOfLines={4}
          placeholder="O que foi encontrado e o que foi feito…"
          value={technicalReport}
          onChangeText={setTechnicalReport}
        />
        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={handleSaveReport}
          disabled={savingReport}
        >
          <Text style={styles.buttonSecondaryText}>
            {savingReport ? "Salvando…" : "Salvar relato"}
          </Text>
        </TouchableOpacity>
      </View>

      {canCheckOut && (
        <TouchableOpacity style={styles.button} onPress={handleCheckOut} disabled={busy === "check-out"}>
          <Text style={styles.buttonText}>
            {busy === "check-out" ? "Fazendo check-out…" : "Concluir (check-out)"}
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipSelected: {
    borderColor: "#1d6e67",
    backgroundColor: "#1d6e67",
  },
  chipText: {
    fontSize: 13,
    color: "#333",
  },
  chipTextSelected: {
    color: "#fff",
  },
  materialAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    width: 64,
    textAlign: "center",
  },
  reportInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    minHeight: 90,
    textAlignVertical: "top",
    fontSize: 15,
  },
});
