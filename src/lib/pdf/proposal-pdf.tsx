import { Document, Page, Text, View } from "@react-pdf/renderer";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { displayClientName, displayClientDocument } from "@/lib/client-display";
import { DocumentFooter, DocumentHeader, styles } from "./shared";

type ProposalPdfProps = {
  company: { name: string; slogan: string | null; logoData: string | null };
  proposal: {
    number: number;
    createdAt: Date;
    validUntil: Date | null;
    demand: string;
    solution: string;
    scope: string | null;
    termText: string | null;
    investment: string | null;
    paymentTerms: string | null;
    notes: string | null;
    serviceName: string | null;
    client: {
      type: string;
      fullName: string | null;
      legalName: string | null;
      tradeName: string | null;
      cpf: string | null;
      cnpj: string | null;
    };
  };
};

export function ProposalPdf({ company, proposal }: ProposalPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocumentHeader
          companyName={company.name}
          slogan={company.slogan}
          logoData={company.logoData}
          title="PROPOSTA COMERCIAL"
          subtitle={`Nº ${proposal.number} — ${formatDateBR(proposal.createdAt)}`}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nome</Text>
            <Text style={styles.value}>{displayClientName(proposal.client)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>
              {proposal.client.type === "PF" ? "CPF" : "CNPJ"}
            </Text>
            <Text style={styles.value}>{displayClientDocument(proposal.client)}</Text>
          </View>
          {proposal.serviceName && (
            <View style={styles.row}>
              <Text style={styles.label}>Serviço</Text>
              <Text style={styles.value}>{proposal.serviceName}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Problema / demanda</Text>
          <Text>{proposal.demand}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Solução proposta</Text>
          <Text>{proposal.solution}</Text>
        </View>

        {proposal.scope && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Escopo</Text>
            <Text>{proposal.scope}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investimento e condições</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Investimento</Text>
            <Text style={styles.value}>
              {proposal.investment ? formatCurrencyBRL(proposal.investment) : "A combinar"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Forma de pagamento</Text>
            <Text style={styles.value}>{proposal.paymentTerms || "A combinar"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Prazo</Text>
            <Text style={styles.value}>{proposal.termText || "A combinar"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Validade da proposta</Text>
            <Text style={styles.value}>
              {proposal.validUntil ? formatDateBR(proposal.validUntil) : "-"}
            </Text>
          </View>
          {proposal.notes && (
            <View style={styles.row}>
              <Text style={styles.label}>Observações</Text>
              <Text style={styles.value}>{proposal.notes}</Text>
            </View>
          )}
        </View>

        <DocumentFooter companyName={company.name} />
      </Page>
    </Document>
  );
}
