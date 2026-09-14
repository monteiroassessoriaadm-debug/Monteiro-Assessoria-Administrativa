import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#14181f",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  logo: {
    height: 48,
    maxWidth: 160,
    objectFit: "contain",
  },
  companyName: {
    fontSize: 13,
    fontWeight: 700,
  },
  companySlogan: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 2,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: 700,
    textAlign: "right",
  },
  docSubtitle: {
    fontSize: 9,
    color: "#64748b",
    textAlign: "right",
    marginTop: 2,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 120,
    color: "#64748b",
  },
  value: {
    flex: 1,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 2,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  tableHeaderCell: {
    fontWeight: 700,
    fontSize: 9,
    textTransform: "uppercase",
    color: "#64748b",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#14181f",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
});

export function DocumentHeader({
  companyName,
  slogan,
  logoData,
  title,
  subtitle,
}: {
  companyName: string;
  slogan?: string | null;
  logoData?: string | null;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.headerRow}>
      <View>
        {logoData ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image (PDF primitive), not an HTML img
          <Image src={logoData} style={styles.logo} />
        ) : (
          <Text style={styles.companyName}>{companyName}</Text>
        )}
        {slogan && <Text style={styles.companySlogan}>{slogan}</Text>}
      </View>
      <View>
        <Text style={styles.docTitle}>{title}</Text>
        <Text style={styles.docSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

export function DocumentFooter({ companyName }: { companyName: string }) {
  return (
    <Text style={styles.footer} fixed>
      {companyName} — documento gerado automaticamente pelo Monteiro CRM
    </Text>
  );
}
