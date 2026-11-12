import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import schema from "./card.schema.json" with { type: "json" };

const MAX_BYTES = 200 * 1024;

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

function nonFinitePaths(value, path, out) {
  if (typeof value === "number" && !Number.isFinite(value)) out.push(path);
  else if (Array.isArray(value)) value.forEach((v, i) => nonFinitePaths(v, `${path}/${i}`, out));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) nonFinitePaths(v, `${path}/${k}`, out);
  return out;
}

export function validateCard(text, slug) {
  if (Buffer.byteLength(text, "utf8") > MAX_BYTES) {
    return { ok: false, errors: [{ path: "", message: `file is larger than ${MAX_BYTES} bytes` }] };
  }
  let card;
  try {
    card = JSON.parse(text);
  } catch (err) {
    return { ok: false, errors: [{ path: "", message: `invalid JSON: ${err.message}` }] };
  }
  const errors = nonFinitePaths(card, "", []).map((path) => ({ path, message: "must be a finite number" }));
  if (!validateSchema(card)) {
    for (const e of validateSchema.errors) errors.push({ path: e.instancePath, message: e.message });
  }
  if (errors.length) return { ok: false, errors };

  if (card.repo !== slug) errors.push({ path: "/repo", message: `must equal "${slug}"` });
  const chart = card.chart;
  if (chart?.type === "interval") {
    chart.rows.forEach((r, i) => {
      if (!(r.low <= r.mid && r.mid <= r.high))
        errors.push({ path: `/chart/rows/${i}`, message: "must satisfy low <= mid <= high" });
      if (chart.x_scale === "log" && r.low <= 0)
        errors.push({ path: `/chart/rows/${i}/low`, message: "must be > 0 on a log scale" });
    });
  }
  if (chart?.type === "line") {
    chart.series.forEach((s, i) =>
      s.points.forEach(([x, y], j) => {
        if (chart.x_scale === "log" && x <= 0)
          errors.push({ path: `/chart/series/${i}/points/${j}/0`, message: "must be > 0 on a log scale" });
        if (chart.y_scale === "log" && y <= 0)
          errors.push({ path: `/chart/series/${i}/points/${j}/1`, message: "must be > 0 on a log scale" });
      }),
    );
  }
  return errors.length ? { ok: false, errors } : { ok: true, card };
}

export function formatErrors(slug, errors) {
  return errors.map((e) => `${slug}: card.json ${e.path || "/"} ${e.message}`).join("\n");
}
