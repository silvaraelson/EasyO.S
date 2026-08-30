import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";

export interface CompanyInfo {
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  logoDataUrl?: string | null;
  signatureDataUrl?: string | null;
}

export const sharedStyles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  logo: { width: 64, height: 64, objectFit: "contain" },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#555555", marginBottom: 20 },
  section: { marginBottom: 16 },
  label: { color: "#555555", marginBottom: 2 },
  signatureBlock: { marginTop: 40, alignItems: "flex-start" },
  signatureImage: { width: 140, height: 50, objectFit: "contain", marginBottom: 4 },
  signatureLine: { borderTopWidth: 1, borderTopColor: "#333333", width: 220, paddingTop: 4 },
});

/** Cabeçalho com nome/logo da empresa — usado em todos os PDFs gerados. */
export function CompanyHeader({ company, subtitle }: { company: CompanyInfo; subtitle: string }) {
  return (
    <View style={sharedStyles.headerRow}>
      <View>
        <Text style={sharedStyles.title}>{company.name}</Text>
        <Text style={sharedStyles.subtitle}>{subtitle}</Text>
        {(company.document || company.phone || company.email) && (
          <Text style={{ fontSize: 9, color: "#777777" }}>
            {[company.document, company.phone, company.email].filter(Boolean).join(" · ")}
          </Text>
        )}
      </View>
      {company.logoDataUrl && <Image src={company.logoDataUrl} style={sharedStyles.logo} />}
    </View>
  );
}

/** Bloco de assinatura no rodapé — usa a assinatura cadastrada, se houver. */
export function SignatureBlock({ company }: { company: CompanyInfo }) {
  return (
    <View style={sharedStyles.signatureBlock}>
      {company.signatureDataUrl && (
        <Image src={company.signatureDataUrl} style={sharedStyles.signatureImage} />
      )}
      <View style={sharedStyles.signatureLine}>
        <Text>{company.name}</Text>
      </View>
    </View>
  );
}

export function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR");
}
