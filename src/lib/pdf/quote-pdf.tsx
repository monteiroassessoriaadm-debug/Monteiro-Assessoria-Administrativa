import { Document, Page, Text, View } from "@react-pdf/renderer";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { displayClientName, displayClientDocument, displayClientAddress } from "@/lib/client-display";
import { DocumentFooter, DocumentHeader, styles } from "./shared";

type QuotePdfProps = {
  company: { name: string; slogan: string | null; logoData: string | null };
  quote: {
    number: number;
    createdAt: Date;
    validUntil: Date | null;
    paymentTerms: string | null;
    notes: string | null;
    items: {
      description: string;
      quantity: number;
      unitPrice: string;
      termDays: number | null;
    }[];
    client: {
      type: string;
      fullName: string | null;
      legalName: string | null;
      tradeName: string | null;
      cpf: string | null;
      cnpj: string | null;
      whatsapp: string | null;
      email: string | null;
      addressStreet: string | null;
      addressNumber: string | null;
      addressComplement: string | null;
      addressNeighborhood: string | null;
      addressCity: string | null;
      addressState: string | null;
      addressZip: string | null;
    };
  };
};

export function QuotePdf({ company, quote }: QuotePdfProps) {
  const total = quote.items.reduce(
    (sum, i) => sum + i.quantity * Number(i.unitPrice),
    0,
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocumentHeader
          companyName={company.name}
          slogan={company.slogan}
          logoData={company.logoData}
          title="ORÇAMENTO"
          subtitle={`Nº ${quote.number} — ${formatDateBR(quote.createdAt)}`}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nome</Text>
            <Text style={styles.value}>{displayClientName(quote.client)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{quote.client.type === "PF" ? "CPF" : "CNPJ"}</Text>
            <Text style={styles.value}>{displayClientDocument(quote.client)}</Text>
          </View>
          {(quote.client.addressStreet || quote.client.addressCity) && (
            <View style={styles.row}>
              <Text style={styles.label}>Endereço</Text>
              <Text style={styles.value}>{displayClientAddress(quote.client)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Contato</Text>
            <Text style={styles.value}>
              {[quote.client.whatsapp, quote.client.email].filter(Boolean).join(" · ") || "-"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Serviços</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Descrição</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Qtd.</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Prazo</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>
                Valor
              </Text>
            </View>
            {quote.items.map((item, idx) => (
              <View style={styles.tableRow} key={idx}>
                <Text style={{ flex: 3 }}>{item.description}</Text>
                <Text style={{ flex: 1 }}>{item.quantity}</Text>
                <Text style={{ flex: 1 }}>{item.termDays ? `${item.termDays} dias` : "-"}</Text>
                <Text style={{ flex: 1, textAlign: "right" }}>
                  {formatCurrencyBRL(item.quantity * Number(item.unitPrice))}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.totalRow}>
            <Text style={{ fontWeight: 700 }}>Total: {formatCurrencyBRL(total)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Condições</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Forma de pagamento</Text>
            <Text style={styles.value}>{quote.paymentTerms || "A combinar"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Validade</Text>
            <Text style={styles.value}>
              {quote.validUntil ? formatDateBR(quote.validUntil) : "-"}
            </Text>
          </View>
          {quote.notes && (
            <View style={styles.row}>
              <Text style={styles.label}>Observações</Text>
              <Text style={styles.value}>{quote.notes}</Text>
            </View>
          )}
        </View>

        <DocumentFooter companyName={company.name} />
      </Page>
    </Document>
  );
}
