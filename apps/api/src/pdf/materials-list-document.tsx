import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { CompanyHeader, formatCurrency, sharedStyles, type CompanyInfo } from "./shared.js";

export interface MaterialsListPdfItem {
  sku: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number; // em centavos
}

export interface MaterialsListPdfProps {
  company: CompanyInfo;
  serviceOrderNumber: number;
  customerName: string;
  items: MaterialsListPdfItem[];
}

const styles = StyleSheet.create({
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
  colSku: { flex: 1 },
  colDesc: { flex: 3 },
  colUnit: { flex: 1, textAlign: "right" },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 14 },
  totalLabel: { fontSize: 12, fontWeight: 700, marginRight: 12 },
  totalValue: { fontSize: 12, fontWeight: 700 },
});

export function MaterialsListPdfDocument(props: MaterialsListPdfProps) {
  const total = props.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  return (
    <Document title={`Lista de Materiais OS #${props.serviceOrderNumber}`}>
      <Page size="A4" style={sharedStyles.page}>
        <CompanyHeader
          company={props.company}
          subtitle={`Lista de Materiais — OS #${props.serviceOrderNumber}`}
        />

        <View style={styles.section}>
          <Text style={styles.label}>Cliente</Text>
          <Text>{props.customerName}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.headerRow}>
            <Text style={[styles.colSku, styles.headerCell]}>SKU</Text>
            <Text style={[styles.colDesc, styles.headerCell]}>Descrição</Text>
            <Text style={[styles.colUnit, styles.headerCell]}>Un.</Text>
            <Text style={[styles.colQty, styles.headerCell]}>Qtd.</Text>
            <Text style={[styles.colPrice, styles.headerCell]}>Unit.</Text>
            <Text style={[styles.colTotal, styles.headerCell]}>Total</Text>
          </View>
          {props.items.length === 0 && <Text>Nenhum material utilizado nessa OS.</Text>}
          {props.items.map((item, index) => (
            <View style={styles.row} key={index}>
              <Text style={styles.colSku}>{item.sku}</Text>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colUnit}>{item.unit}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.colTotal}>{formatCurrency(item.quantity * item.unitPrice)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>
      </Page>
    </Document>
  );
}
