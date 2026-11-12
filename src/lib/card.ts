export type Metric = { label: string; value: number; unit: string; higher_is_better: boolean };

export type Series = {
  name: string;
  style: "solid" | "dashed" | "dots";
  points: [number | string, number][];
};

export type LineChart = {
  type: "line";
  x_label: string;
  x_unit: string;
  x_scale: "linear" | "log" | "time";
  y_label: string;
  y_unit: string;
  y_scale: "linear" | "log";
  series: Series[];
};

export type IntervalRow = { label: string; low: number; mid: number; high: number };

export type IntervalChart = {
  type: "interval";
  x_label: string;
  x_unit: string;
  x_scale: "linear" | "log";
  rows: IntervalRow[];
};

export type Chart = LineChart | IntervalChart;

export type Card = {
  schema_version: 1;
  repo: string;
  sha: string;
  generated_at: string;
  command: string;
  data_note: string;
  metric: Metric;
  takeaway: string;
  chart: Chart | null;
};
