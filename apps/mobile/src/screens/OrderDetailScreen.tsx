import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import type { GeoPoint, Material } from "@easy-os/schemas";
import type { RootStackParamList } from "../navigation";
import { api } from "../lib/api";
import { PRIORITY_LABELS, STATUS_LABELS } from "../lib/labels";
import { database } from "../db/database";
import { useServiceOrder } from "../db/hooks";
import { runSync } from "../db/sync";

type Props = NativeStackScreenProps<RootStackParamList, "OrderDetail">;

const REPORT_AUTOSAVE_DELAY_MS = 900;
const PHOTO_QUALITY = 0.35;

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
  const [checkingOut, setCheckingOut] = useState(false);

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

  function invalidateDetail() {
    queryClient.invalidateQueries({ queryKey: ["service-orders", orderId, "detail"] });
  }

  // --- relato: salva automaticamente, sem botão -------------------------
  const [technicalReport, setTechnicalReport] = useState("");
  const [reportStatus, setReportStatus] = useState<"idle" | "saving" | "saved">("idle");
  const lastSavedReportRef = useRef<string | undefined>(undefined);
  const reportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lastSavedReportRef.current === undefined && remoteTechnicalReport !== undefined) {
      setTechnicalReport(remoteTechnicalReport ?? "");
      lastSavedReportRef.current = remoteTechnicalReport ?? "";
    }
  }, [remoteTechnicalReport]);

  useEffect(() => {
    return () => {
      if (reportTimerRef.current) clearTimeout(reportTimerRef.current);
    };
  }, []);

  async function saveReport(text: string) {
    if (text === lastSavedReportRef.current) return;
    setReportStatus("saving");
    try {
      await api.serviceOrders.updateTechnicalReport(orderId, text);
      lastSavedReportRef.current = text;
      setReportStatus("saved");
    } catch {
      // falha silenciosa — tenta de novo na próxima alteração ou reabertura da tela
      setReportStatus("idle");
    }
  }

  function handleReportChange(text: string) {
    setTechnicalReport(text);
    setReportStatus("idle");
    if (reportTimerRef.current) clearTimeout(reportTimerRef.current);
    reportTimerRef.current = setTimeout(() => saveReport(text), REPORT_AUTOSAVE_DELAY_MS);
  }

  // --- materiais usados: modal de seleção + quantidade -------------------
  const [materialModalVisible, setMaterialModalVisible] = useState(false);
  const [pendingMaterial, setPendingMaterial] = useState<Material | null>(null);
  const [materialQuantity, setMaterialQuantity] = useState("1");
  const [addingMaterial, setAddingMaterial] = useState(false);

  function openMaterialModal() {
    setPendingMaterial(null);
    setMaterialQuantity("1");
    setMaterialModalVisible(true);
  }

  function closeMaterialModal() {
    setMaterialModalVisible(false);
    setPendingMaterial(null);
  }

  async function handleAddMaterial() {
    if (!pendingMaterial) return;
    const quantity = Number(materialQuantity);
    if (!quantity || quantity <= 0) return;

    setAddingMaterial(true);
    try {
      await api.finance.addMaterialUsage(orderId, pendingMaterial.id, quantity);
      invalidateDetail();
      closeMaterialModal();
    } catch (error) {
      Alert.alert("Erro ao lançar material", (error as Error).message);
    } finally {
      setAddingMaterial(false);
    }
  }

  // --- check-in: automático ao abrir a OS --------------------------------
  async function handleCheckIn() {
    if (!order) return;
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
    }
  }

  useEffect(() => {
    if (order?.status === "scheduled") {
      handleCheckIn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status]);

  async function handleCheckOut() {
    if (!order) return;
    setCheckingOut(true);
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
      Alert.alert("Erro ao finalizar a OS", (error as Error).message);
    } finally {
      setCheckingOut(false);
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

  // --- fotos: várias em sequência, upload em segundo plano ----------------
  const [localPhotos, setLocalPhotos] = useState<{ id: string; uri: string }[]>([]);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  async function handleTakePhoto() {
    if (!order) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error("Permissão de câmera negada");

      const result = await ImagePicker.launchCameraAsync({ base64: true, quality: PHOTO_QUALITY });
      const asset = result.assets?.[0];
      if (result.canceled || !asset?.base64 || !asset.uri) return;

      const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setLocalPhotos((current) => [...current, { id: localId, uri: asset.uri }]);

      const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
      api.serviceOrders
        .addAttachment(order.id, { kind: "photo", dataUrl })
        .then(() => {
          setLocalPhotos((current) => current.filter((photo) => photo.id !== localId));
          invalidateDetail();
        })
        .catch((error) => {
          setLocalPhotos((current) => current.filter((photo) => photo.id !== localId));
          Alert.alert(
            "Erro ao enviar foto",
            `${(error as Error).message} — a foto não foi salva, tente de novo quando tiver sinal.`,
          );
        });
    } catch (error) {
      Alert.alert("Erro ao tirar foto", (error as Error).message);
    }
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const canCheckOut = order.status === "in_progress" || order.status === "paused";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>OS #{order.number}</Text>
        <Text style={styles.meta}>
          {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ?? order.status} ·{" "}
          {PRIORITY_LABELS[order.priority as keyof typeof PRIORITY_LABELS] ?? order.priority}
        </Text>
        {order.description && <Text style={styles.description}>{order.description}</Text>}

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
          {(photos.length > 0 || localPhotos.length > 0) && (
            <View style={styles.photoRow}>
              {photos.map((attachment) => (
                <TouchableOpacity key={attachment.id} onPress={() => setViewerUri(attachment.url)}>
                  <Image source={{ uri: attachment.url }} style={styles.photo} />
                </TouchableOpacity>
              ))}
              {localPhotos.map((photo) => (
                <TouchableOpacity key={photo.id} onPress={() => setViewerUri(photo.uri)}>
                  <Image source={{ uri: photo.uri }} style={styles.photo} />
                  <View style={styles.photoUploadingBadge}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity style={styles.buttonSecondary} onPress={handleTakePhoto}>
            <Text style={styles.buttonSecondaryText}>Tirar foto</Text>
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
          <TouchableOpacity style={styles.buttonSecondary} onPress={openMaterialModal}>
            <Text style={styles.buttonSecondaryText}>Selecionar material</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.reportHeader}>
            <Text style={styles.sectionTitle}>Relato</Text>
            {reportStatus === "saving" && <Text style={styles.reportStatus}>Salvando…</Text>}
            {reportStatus === "saved" && <Text style={styles.reportStatus}>Salvo</Text>}
          </View>
          <TextInput
            style={styles.reportInput}
            multiline
            numberOfLines={4}
            placeholder="O que foi encontrado e o que foi feito…"
            value={technicalReport}
            onChangeText={handleReportChange}
          />
        </View>

        {canCheckOut && (
          <TouchableOpacity style={styles.button} onPress={handleCheckOut} disabled={checkingOut}>
            <Text style={styles.buttonText}>{checkingOut ? "Finalizando…" : "Finalizar O.S."}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={materialModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeMaterialModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {!pendingMaterial ? (
              <>
                <Text style={styles.sectionTitle}>Selecionar material</Text>
                <ScrollView style={styles.modalList}>
                  {materials.map((material) => (
                    <TouchableOpacity
                      key={material.id}
                      style={styles.modalRow}
                      onPress={() => setPendingMaterial(material)}
                    >
                      <Text style={styles.modalRowText}>{material.description}</Text>
                      <Text style={styles.modalRowMeta}>{material.stockQuantity} em estoque</Text>
                    </TouchableOpacity>
                  ))}
                  {materials.length === 0 && <Text style={styles.meta}>Nenhum material cadastrado.</Text>}
                </ScrollView>
                <TouchableOpacity style={styles.buttonSecondary} onPress={closeMaterialModal}>
                  <Text style={styles.buttonSecondaryText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>{pendingMaterial.description}</Text>
                <Text style={styles.meta}>{pendingMaterial.stockQuantity} em estoque</Text>
                <TextInput
                  style={styles.quantityInputLarge}
                  keyboardType="numeric"
                  value={materialQuantity}
                  onChangeText={setMaterialQuantity}
                  autoFocus
                />
                <TouchableOpacity style={styles.button} onPress={handleAddMaterial} disabled={addingMaterial}>
                  <Text style={styles.buttonText}>{addingMaterial ? "Lançando…" : "Adicionar"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.buttonSecondary}
                  onPress={() => setPendingMaterial(null)}
                >
                  <Text style={styles.buttonSecondaryText}>Voltar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(viewerUri)}
        animationType="fade"
        transparent
        onRequestClose={() => setViewerUri(null)}
      >
        <TouchableOpacity
          style={styles.viewerOverlay}
          activeOpacity={1}
          onPress={() => setViewerUri(null)}
        >
          {viewerUri && (
            <Image source={{ uri: viewerUri }} style={styles.viewerImage} resizeMode="contain" />
          )}
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scroll: {
    flex: 1,
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
  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reportStatus: {
    fontSize: 12,
    color: "#999",
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
  photoUploadingBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "80%",
  },
  modalList: {
    marginTop: 8,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalRowText: {
    fontSize: 15,
    flex: 1,
    marginRight: 12,
  },
  modalRowMeta: {
    fontSize: 13,
    color: "#666",
  },
  quantityInputLarge: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: "center",
    marginTop: 12,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: {
    width: "100%",
    height: "100%",
  },
});
