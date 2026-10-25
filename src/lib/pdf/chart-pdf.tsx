import { Svg, Line, Polyline, Circle, Text, View } from "@react-pdf/renderer";

export type PdfChartSeries = {
  label: string;
  color: string;
  values: number[];
  dashed?: boolean;
};

const GRID_COLOR = "#e1e0d9";
const AXIS_COLOR = "#c3c2b7";
const MUTED_TEXT = "#898781";

export function PdfLineChart({
  width,
  height,
  labels,
  series,
  valueFormatter,
}: {
  width: number;
  height: number;
  labels: string[];
  series: PdfChartSeries[];
  valueFormatter: (v: number) => string;
}) {
  const padding = { top: 10, right: 6, bottom: 20, left: 46 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const allValues = series.flatMap((s) => s.values);
  const maxValue = Math.max(1, ...allValues);
  const n = labels.length;
  const xStep = n > 1 ? chartW / (n - 1) : 0;

  const xAt = (i: number) => padding.left + i * xStep;
  const yAt = (v: number) => padding.top + chartH - (v / maxValue) * chartH;

  const labelIndexes = Array.from(
    new Set([0, Math.floor((n - 1) / 4), Math.floor((n - 1) / 2), Math.floor(((n - 1) * 3) / 4), n - 1]),
  );

  return (
    <View>
      <Svg width={width} height={height}>
        {[0, 0.5, 1].map((f) => (
          <Line
            key={f}
            x1={padding.left}
            y1={padding.top + chartH * (1 - f)}
            x2={padding.left + chartW}
            y2={padding.top + chartH * (1 - f)}
            stroke={GRID_COLOR}
            strokeWidth={1}
          />
        ))}
        <Line
          x1={padding.left}
          y1={padding.top + chartH}
          x2={padding.left + chartW}
          y2={padding.top + chartH}
          stroke={AXIS_COLOR}
          strokeWidth={1}
        />

        <Text x={padding.left - 6} y={padding.top + 6} textAnchor="end" style={{ fontSize: 7, color: MUTED_TEXT }}>
          {valueFormatter(maxValue)}
        </Text>
        <Text
          x={padding.left - 6}
          y={padding.top + chartH + 3}
          textAnchor="end"
          style={{ fontSize: 7, color: MUTED_TEXT }}
        >
          0
        </Text>

        {labelIndexes.map((i) => (
          <Text
            key={i}
            x={xAt(i)}
            y={height - 6}
            textAnchor="middle"
            style={{ fontSize: 7, color: MUTED_TEXT }}
          >
            {labels[i]}
          </Text>
        ))}

        {series.map((s) => (
          <Polyline
            key={s.label}
            points={s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ")}
            stroke={s.color}
            strokeWidth={2}
            fill="none"
            strokeDasharray={s.dashed ? "6,4" : undefined}
          />
        ))}
        {series.map((s) =>
          s.values.map((v, i) => (
            <Circle key={`${s.label}-${i}`} cx={xAt(i)} cy={yAt(v)} r={2} fill={s.color} />
          )),
        )}
      </Svg>
      {series.length > 1 && (
        <View style={{ flexDirection: "row", gap: 16, marginTop: 4, paddingLeft: padding.left }}>
          {series.map((s) => (
            <View key={s.label} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 10, height: 2, backgroundColor: s.color }} />
              <Text style={{ fontSize: 8, color: "#52514e" }}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
