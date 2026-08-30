import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  CompanyHeader,
  formatDate,
  SignatureBlock,
  sharedStyles,
  type CompanyInfo,
} from "./shared.js";

export interface TechnicalReportPdfProps {
  company: CompanyInfo;
  serviceOrderNumber: number;
  serviceTypeName: string;
  customerName: string;
  customerDocument: string;
  addressLine: string;
  technicianName?: string;
  checkInAt?: Date | null;
  checkOutAt?: Date | null;
  description?: string;
  technicalReport?: string;
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  label: { color: "#555555", marginBottom: 2 },
  body: { lineHeight: 1.5 },
});

export function TechnicalReportPdfDocument(props: TechnicalReportPdfProps) {
  return (
    <Document title={`Laudo Técnico OS #${props.serviceOrderNumber}`}>
      <Page size="A4" style={sharedStyles.page}>
        <CompanyHeader
          company={props.company}
          subtitle={`Laudo Técnico — OS #${props.serviceOrderNumber} · ${props.serviceTypeName}`}
        />

        <View style={styles.section}>
          <Text style={styles.label}>Cliente</Text>
          <Text>
            {props.customerName} — {props.customerDocument}
          </Text>
          <Text>{props.addressLine}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Atendimento</Text>
          <Text>Técnico: {props.technicianName ?? "—"}</Text>
          <Text>
            Início: {props.checkInAt ? formatDate(props.checkInAt) : "—"} · Conclusão:{" "}
            {props.checkOutAt ? formatDate(props.checkOutAt) : "—"}
          </Text>
        </View>

        {props.description && (
          <View style={styles.section}>
            <Text style={styles.label}>Descrição do problema</Text>
            <Text style={styles.body}>{props.description}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Diagnóstico e serviço executado</Text>
          <Text style={styles.body}>
            {props.technicalReport ?? "Nenhuma observação registrada."}
          </Text>
        </View>

        <SignatureBlock company={props.company} />
      </Page>
    </Document>
  );
}
