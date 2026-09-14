import { Document, Page, Text, View } from "@react-pdf/renderer";
import { formatDateBR } from "@/lib/utils";
import { DocumentFooter, DocumentHeader, styles } from "./shared";

type DocumentPdfProps = {
  company: { name: string; slogan: string | null; logoData: string | null };
  document: {
    number: number;
    title: string;
    createdAt: Date;
    headerNote: string | null;
    footerNote: string | null;
    renderedContent: string;
  };
};

export function GeneratedDocumentPdf({ company, document }: DocumentPdfProps) {
  const paragraphs = document.renderedContent.split(/\n{2,}/);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocumentHeader
          companyName={company.name}
          slogan={company.slogan}
          logoData={company.logoData}
          title={document.title}
          subtitle={`Nº ${document.number} — ${formatDateBR(document.createdAt)}`}
        />

        {document.headerNote && (
          <View style={styles.section}>
            <Text>{document.headerNote}</Text>
          </View>
        )}

        <View style={styles.section}>
          {paragraphs.map((p, idx) => (
            <Text key={idx} style={{ marginBottom: 10, lineHeight: 1.5 }}>
              {p}
            </Text>
          ))}
        </View>

        <View style={{ marginTop: 40 }}>
          <View style={{ borderTopWidth: 1, borderTopColor: "#14181f", width: 220, marginBottom: 4 }} />
          <Text>Assinatura</Text>
        </View>

        {document.footerNote && (
          <View style={styles.section}>
            <Text style={{ fontSize: 9, color: "#64748b" }}>{document.footerNote}</Text>
          </View>
        )}

        <DocumentFooter companyName={company.name} />
      </Page>
    </Document>
  );
}
