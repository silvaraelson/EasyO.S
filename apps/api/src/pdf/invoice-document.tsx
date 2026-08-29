import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export interface InvoicePdfLineItem {
  description: string;
  quantity: number;
  unitPrice: number; // em centavos
}

export interface InvoicePdfProps {
  serviceOrderNumber: number;
  issuedAt: Date;
  paidAt?: Date | null;
  paymentMethodLabel?: string;
  customerName: string;
  customerDocument: string;
  addressLine: string;
  items: InvoicePdfLineItem[];
  totalAmount: number; // em centavos
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#555555", marginBottom: 20 },
  section: { marginBottom: 16 },
  label: { color: "#555555", marginBottom: 2 },
  row: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
    paddingBottom: 5,
    marginBottom: 2,
  },
  headerCell: { fontWeight: 700 },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colUnit: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 14 },
  totalLabel: { fontSize: 12, fontWeight: 700, marginRight: 12 },
  totalValue: { fontSize: 12, fontWeight: 700 },
});

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR");
}

export function InvoicePdfDocument(props: InvoicePdfProps) {
  return (
    <Document title={`Fatura OS #${props.serviceOrderNumber}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Easy OS</Text>
        <Text style={styles.subtitle}>
          Fatura da OS #{props.serviceOrderNumber} — emitida em {formatDate(props.issuedAt)}
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>Cliente</Text>
          <Text>
            {props.customerName} — {props.customerDocument}
          </Text>
          <Text>{props.addressLine}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.headerRow}>
            <Text style={[styles.colDesc, styles.headerCell]}>Descrição</Text>
            <Text style={[styles.colQty, styles.headerCell]}>Qtd.</Text>
            <Text style={[styles.colUnit, styles.headerCell]}>Unit.</Text>
            <Text style={[styles.colTotal, styles.headerCell]}>Total</Text>
          </View>
          {props.items.map((item, index) => (
            <View style={styles.row} key={index}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnit}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.colTotal}>
                {formatCurrency(item.quantity * item.unitPrice)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(props.totalAmount)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Pagamento</Text>
          <Text>
            {props.paidAt
              ? `Pago em ${formatDate(props.paidAt)}${
                  props.paymentMethodLabel ? ` — ${props.paymentMethodLabel}` : ""
                }`
              : "Pendente"}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
