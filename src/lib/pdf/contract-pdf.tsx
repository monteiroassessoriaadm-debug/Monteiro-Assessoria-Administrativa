import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { splitContractBlocks } from "@/lib/contract-render";

// Identidade da Monteiro: preto e dourado.
const BLACK = "#0f0f0f";
const GOLD = "#bd9548"; // dourado oficial (mesmo da proposta comercial)
const MUTED = "#64748b";

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 56, paddingHorizontal: 48, fontSize: 10, fontFamily: "Helvetica", color: BLACK, lineHeight: 1.45 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 18, borderBottomWidth: 2, borderBottomColor: GOLD },
  logo: { height: 42, maxWidth: 150, objectFit: "contain" },
  company: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  slogan: { fontSize: 8, color: GOLD, marginTop: 2 },
  code: { fontSize: 9, color: MUTED, textAlign: "right" },
  codeStrong: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right" },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 14, letterSpacing: 0.5 },
  heading: { fontSize: 10, fontFamily: "Helvetica-Bold", color: GOLD, marginTop: 10, marginBottom: 4 },
  paragraph: { marginBottom: 7, textAlign: "justify" },
  signatures: { marginTop: 28, flexDirection: "row", justifyContent: "space-between" },
  signBox: { width: "46%" },
  signLine: { borderTopWidth: 1, borderTopColor: BLACK, marginBottom: 4 },
  signRole: { fontSize: 8, color: GOLD, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  signName: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  signDoc: { fontSize: 8, color: MUTED },
  hint: { marginTop: 18, fontSize: 8, color: MUTED, textAlign: "center" },
  draft: { position: "absolute", top: 380, left: 90, fontSize: 64, color: "#e5e7eb", transform: "rotate(-30deg)", fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 24, left: 48, right: 150, fontSize: 7.5, color: MUTED },
});

export type ContractPdfProps = {
  company: { name: string; slogan: string | null; logoData: string | null; representativeName: string | null; cnpj: string | null };
  contract: {
    code: string | null; // null = prévia de modelo
    kind: "CONTRATO" | "DOCUMENTO";
    status: string;
    version: number | null;
    renderedContent: string;
    clientName: string | null;
    clientDocument: string | null;
  };
};

export function ContractPdf({ company, contract }: ContractPdfProps) {
  const blocks = splitContractBlocks(contract.renderedContent);
  const isDraft = contract.code === null || contract.status === "RASCUNHO";
  const footerLeft = [company.name, contract.code, contract.version ? `versão ${contract.version}` : null].filter(Boolean).join(" · ");

  return (
    <Document title={contract.code ?? "Prévia do modelo"} author={company.name}>
      <Page size="A4" style={s.page}>
        {isDraft && contract.kind === "CONTRATO" && (
          <Text style={s.draft} fixed>
            {contract.code ? "RASCUNHO" : "MODELO"}
          </Text>
        )}

        <Text style={s.footer} fixed>
          {footerLeft}
        </Text>
        <View style={s.header} fixed>
          <View>
            {company.logoData ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- Image do @react-pdf/renderer, não é <img>
              <Image src={company.logoData} style={s.logo} />
            ) : (
              <Text style={s.company}>{company.name}</Text>
            )}
            {company.slogan && <Text style={s.slogan}>{company.slogan}</Text>}
          </View>
          {contract.code && (
            <View>
              <Text style={s.code}>{contract.kind === "CONTRATO" ? "Contrato" : "Documento"}</Text>
              <Text style={s.codeStrong}>{contract.code}</Text>
            </View>
          )}
        </View>

        {blocks.map((b, i) =>
          b.type === "title" ? (
            <Text key={i} style={s.title}>
              {b.text}
            </Text>
          ) : b.type === "heading" ? (
            <Text key={i} style={s.heading} minPresenceAhead={40}>
              {b.text}
            </Text>
          ) : (
            <Text key={i} style={s.paragraph}>
              {b.text}
            </Text>
          ),
        )}

        {contract.kind === "CONTRATO" && (
          <View wrap={false}>
            <View style={s.signatures}>
              <View style={s.signBox}>
                <View style={s.signLine} />
                <Text style={s.signRole}>CONTRATADA</Text>
                <Text style={s.signName}>{company.name}</Text>
                <Text style={s.signDoc}>
                  {[company.cnpj ? `CNPJ ${company.cnpj}` : null, company.representativeName].filter(Boolean).join(" · ")}
                </Text>
              </View>
              <View style={s.signBox}>
                <View style={s.signLine} />
                <Text style={s.signRole}>CONTRATANTE</Text>
                <Text style={s.signName}>{contract.clientName ?? " "}</Text>
                <Text style={s.signDoc}>{contract.clientDocument ?? " "}</Text>
              </View>
            </View>
            <Text style={s.hint}>Assinatura eletrônica gratuita pelo gov.br: assinador.iti.br</Text>
          </View>
        )}

      </Page>
    </Document>
  );
}
