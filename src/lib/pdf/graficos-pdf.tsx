import { Document, Page, Text, View } from "@react-pdf/renderer";
import { formatDateBR } from "@/lib/utils";
import { DocumentFooter, DocumentHeader, styles } from "./shared";
import { PdfLineChart } from "./chart-pdf";

type GraficosPdfProps = {
  company: { name: string; slogan: string | null; logoData: string | null };
  generatedAt: Date;
  monthLabels: string[];
  clientesSerie: number[];
  leadsSerie: number[];
  financeiro: { receitaSerie: number[]; despesaSerie: number[] } | null;
  numberFormatter: (v: number) => string;
  currencyFormatter: (v: number) => string;
};

export function GraficosPdf({
  company,
  generatedAt,
  monthLabels,
  clientesSerie,
  leadsSerie,
  financeiro,
  numberFormatter,
  currencyFormatter,
}: GraficosPdfProps) {
  const chartWidth = 500;
  const chartHeight = 190;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocumentHeader
          companyName={company.name}
          slogan={company.slogan}
          logoData={company.logoData}
          title="RELATÓRIO DE EVOLUÇÃO"
          subtitle={`Últimos 12 meses — gerado em ${formatDateBR(generatedAt)}`}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Novos clientes por mês</Text>
          <PdfLineChart
            width={chartWidth}
            height={chartHeight}
            labels={monthLabels}
            series={[{ label: "Novos clientes", color: "#2a78d6", values: clientesSerie }]}
            valueFormatter={numberFormatter}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leads convertidos por mês</Text>
          <PdfLineChart
            width={chartWidth}
            height={chartHeight}
            labels={monthLabels}
            series={[{ label: "Leads convertidos", color: "#6250d6", values: leadsSerie }]}
            valueFormatter={numberFormatter}
          />
        </View>

        {financeiro && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Faturamento recebido por mês</Text>
              <PdfLineChart
                width={chartWidth}
                height={chartHeight}
                labels={monthLabels}
                series={[{ label: "Recebido", color: "#008300", values: financeiro.receitaSerie }]}
                valueFormatter={currencyFormatter}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Receita x Despesa por mês</Text>
              <PdfLineChart
                width={chartWidth}
                height={chartHeight}
                labels={monthLabels}
                series={[
                  { label: "Receita", color: "#008300", values: financeiro.receitaSerie },
                  { label: "Despesa", color: "#e34948", values: financeiro.despesaSerie, dashed: true },
                ]}
                valueFormatter={currencyFormatter}
              />
            </View>
          </>
        )}

        <DocumentFooter companyName={company.name} />
      </Page>
    </Document>
  );
}
