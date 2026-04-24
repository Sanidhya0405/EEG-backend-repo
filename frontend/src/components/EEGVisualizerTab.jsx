import { useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

const CHANNELS = ["P4", "Cz", "F8", "T7"];
const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];
const SAMPLING_RATE = 256;

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line, i) => {
    const vals = line.split(",");
    const row = { sample: i, time: +(i / SAMPLING_RATE).toFixed(4) };
    headers.forEach((h, j) => { row[h] = parseFloat(vals[j]) || 0; });
    return row;
  });
}

function ChannelStats({ data, channel }) {
  const vals = data.map((d) => d[channel]).filter((v) => !isNaN(v));
  if (!vals.length) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
  return (
    <div className="eeg-stats-row">
      <span>Mean: <b>{mean.toFixed(3)}</b></span>
      <span>Std: <b>{std.toFixed(3)}</b></span>
      <span>Min: <b>{min.toFixed(3)}</b></span>
      <span>Max: <b>{max.toFixed(3)}</b></span>
    </div>
  );
}

export default function EEGVisualizerTab() {
  const [allData, setAllData] = useState([]);
  const [fileName, setFileName] = useState("");
  const [windowStart, setWindowStart] = useState(0);
  const [windowSec, setWindowSec] = useState(2);
  const [activeChannels, setActiveChannels] = useState(new Set(CHANNELS));
  const [error, setError] = useState("");

  const totalSamples = allData.length;
  const windowSamples = windowSec * SAMPLING_RATE;
  const visibleData = allData.slice(windowStart, windowStart + windowSamples);

  const onFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) { setError("Please upload a CSV file."); return; }
    setError("");
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target.result);
        setAllData(parsed);
        setWindowStart(0);
      } catch {
        setError("Failed to parse CSV. Make sure it has P4, Cz, F8, T7 columns.");
      }
    };
    reader.readAsText(file);
  }, []);

  const toggleChannel = (ch) => {
    setActiveChannels((prev) => {
      const next = new Set(prev);
      next.has(ch) ? next.delete(ch) : next.add(ch);
      return next;
    });
  };

  const maxStart = Math.max(0, totalSamples - windowSamples);
  const totalSec = +(totalSamples / SAMPLING_RATE).toFixed(1);

  return (
    <section className="panel">
      <h2>EEG Signal Visualizer</h2>
      <p className="muted">Upload an EEG CSV file to visualize all 4 channels interactively.</p>

      <div className="eeg-controls">
        <label style={{ flex: 1 }}>
          Upload EEG CSV
          <input type="file" accept=".csv" onChange={onFile} />
        </label>
        {allData.length > 0 && (
          <>
            <label>
              Window Size
              <select value={windowSec} onChange={(e) => { setWindowSec(Number(e.target.value)); setWindowStart(0); }}>
                {[1, 2, 5, 10].map((s) => <option key={s} value={s}>{s}s ({s * SAMPLING_RATE} samples)</option>)}
              </select>
            </label>
          </>
        )}
      </div>

      {error && <p className="field-error" style={{ marginTop: 8 }}>{error}</p>}

      {allData.length > 0 && (
        <>
          <div className="eeg-file-info">
            <span>📄 <b>{fileName}</b></span>
            <span>Total: <b>{totalSamples} samples</b> ({totalSec}s)</span>
            <span>Sampling Rate: <b>{SAMPLING_RATE} Hz</b></span>
            <span>Channels: <b>{CHANNELS.length}</b></span>
          </div>

          {/* Channel toggles */}
          <div className="chip-row" style={{ margin: "12px 0" }}>
            {CHANNELS.map((ch, i) => (
              <button
                key={ch}
                type="button"
                className={`chip${activeChannels.has(ch) ? " chip-active" : ""}`}
                style={{ borderColor: activeChannels.has(ch) ? COLORS[i] : undefined, color: activeChannels.has(ch) ? COLORS[i] : undefined }}
                onClick={() => toggleChannel(ch)}
              >
                {ch}
              </button>
            ))}
          </div>

          {/* Time window scrubber */}
          <div className="eeg-scrubber">
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              Viewing: {+(windowStart / SAMPLING_RATE).toFixed(2)}s — {+((windowStart + windowSamples) / SAMPLING_RATE).toFixed(2)}s
            </span>
            <input
              type="range"
              min={0}
              max={maxStart}
              step={SAMPLING_RATE / 4}
              value={windowStart}
              onChange={(e) => setWindowStart(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{totalSec}s</span>
          </div>

          {/* Individual channel charts */}
          {CHANNELS.filter((ch) => activeChannels.has(ch)).map((ch, i) => (
            <div key={ch} className="chart-card" style={{ marginBottom: 20 }}>
              <h3 style={{ color: COLORS[CHANNELS.indexOf(ch)], borderBottomColor: COLORS[CHANNELS.indexOf(ch)] }}>
                Channel: {ch}
              </h3>
              <ChannelStats data={allData} channel={ch} />
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={visibleData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(v) => `${v.toFixed(2)}s`}
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted)"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted)" width={55} />
                  <Tooltip
                    formatter={(v) => [v.toFixed(4), ch]}
                    labelFormatter={(l) => `Time: ${Number(l).toFixed(3)}s`}
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}
                  />
                  <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey={ch}
                    stroke={COLORS[CHANNELS.indexOf(ch)]}
                    dot={false}
                    strokeWidth={1.5}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}

          {/* All channels overlay */}
          {activeChannels.size > 1 && (
            <div className="chart-card">
              <h3>All Channels Overlay</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={visibleData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tickFormatter={(v) => `${v.toFixed(2)}s`} tick={{ fontSize: 11 }} stroke="var(--muted)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted)" width={55} />
                  <Tooltip
                    labelFormatter={(l) => `Time: ${Number(l).toFixed(3)}s`}
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
                  {CHANNELS.filter((ch) => activeChannels.has(ch)).map((ch, i) => (
                    <Line key={ch} type="monotone" dataKey={ch} stroke={COLORS[CHANNELS.indexOf(ch)]} dot={false} strokeWidth={1.5} isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {!allData.length && !error && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🧠</div>
          <p>Upload an EEG CSV file to visualize signals</p>
          <p style={{ fontSize: "0.85rem" }}>Supports files from <code>data/Filtered_Data/</code> e.g. <code>s01_ex05.csv</code></p>
        </div>
      )}
    </section>
  );
}
