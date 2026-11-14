import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDateBR } from "@/lib/utils";

// Fechamento do mês das Finanças Pessoais. Sem logo nem dados da empresa: é documento pessoal.

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#14181f" },
  title: { fontSize: 16, fontWeight: 700 },
  subtitle: { fontSize: 9, color: "#64748b", marginTop: 2, marginBottom: 18 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  muted: { color: "#64748b" },
  boxes: { flexDirection: "row", gap: 8, marginBottom: 16 },
  box: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, padding: 8 },
  boxValue: { fontSize: 13, fontWeight: 700, marginTop: 2 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: "#94a3b8", textAlign: "center" },
});

type Row = { label: string; value: string; hint?: string };

export function PfFechamentoPdf(props: {
  monthTitle: string;
  generatedAt: Date;
  boxes: Row[];
  indicators: Row[];
  comparison: Row[];
  categories: Row[];
}) {
  const table = (rows: Row[]) =>
    rows.map((r) => (
      <View key={r.label} style={s.row}>
        <Text>
          {r.label}
          {r.hint ? <Text style={s.muted}> · {r.hint}</Text> : null}
        </Text>
        <Text>{r.value}</Text>
      </View>
    ));
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Fechamento do mês — {props.monthTitle}</Text>
        <Text style={s.subtitle}>Finanças Pessoais · gerado em {formatDateBR(props.generatedAt)}</Text>
        <View style={s.boxes}>
          {props.boxes.map((b) => (
            <View key={b.label} style={s.box}>
              <Text style={s.muted}>{b.label}</Text>
              <Text style={s.boxValue}>{b.value}</Text>
            </View>
          ))}
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Indicadores</Text>
          {table(props.indicators)}
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Comparação com o mês anterior</Text>
          {table(props.comparison)}
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Gastos por categoria</Text>
          {props.categories.length ? table(props.categories) : <Text style={s.muted}>Nenhum gasto no mês.</Text>}
        </View>
        <Text style={s.footer} fixed>
          Documento pessoal — não faz parte dos números da empresa.
        </Text>
      </Page>
    </Document>
  );
}

