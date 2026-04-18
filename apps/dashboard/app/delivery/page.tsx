"use client";

import { useState, useEffect, useCallback } from "react";
import { useBusiness } from "@/hooks/use-business";
import type { DeliveryPrediction } from "@/app/api/delivery/predict/route";

const C = { g:"#00B67A", o:"#FF6B35", b:"#3B82F6", st:"#6B7C93", cl:"#F8FAFB", navy:"#1C2D48", mist:"rgba(255,255,255,.07)", r:"#FF4757" };

const PROVIDER_LABELS: Record<string, string> = {
  uber_direct:    "Uber Direct only",
  tasker:         "Tasker driver(s)",
  tasker_and_uber:"Taskers + Uber Direct overflow",
  none:           "No deliveries expected",
};

const PROVIDER_COLORS: Record<string, string> = {
  uber_direct:    C.b,
  tasker:         C.g,
  tasker_and_uber:C.o,
  none:           C.st,
};

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function todayString() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function nextNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default function DeliveryPage() {
  const { businessId } = useBusiness();

  const [selectedDate, setSelectedDate] = useState(todayString());
  const [prediction,   setPrediction]   = useState<DeliveryPrediction | null>(null);
  const [weekPlan,     setWeekPlan]     = useState<DeliveryPrediction[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [weekLoading,  setWeekLoading]  = useState(false);

  const fetchPrediction = useCallback(async (date: string) => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/delivery/predict?business_id=${businessId}&date=${date}`);
      const data = await res.json();
      if (!data.error) setPrediction(data);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const fetchWeekPlan = useCallback(async () => {
    if (!businessId) return;
    setWeekLoading(true);
    try {
      const dates = nextNDays(7);
      const results = await Promise.all(
        dates.map(d =>
          fetch(`/api/delivery/predict?business_id=${businessId}&date=${d}`)
            .then(r => r.json())
            .catch(() => null)
        )
      );
      setWeekPlan(results.filter(Boolean));
    } finally {
      setWeekLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    fetchPrediction(selectedDate);
    fetchWeekPlan();
  }, [businessId, fetchPrediction, fetchWeekPlan]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPrediction(selectedDate);
  }, [selectedDate, fetchPrediction]);

  const rec = prediction?.recommendation;
  const providerColor = rec ? PROVIDER_COLORS[rec.provider] : C.st;

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>Smart Delivery Routing</h2>
        <p style={{ color:C.st, fontSize:12, marginTop:2 }}>
          AI predicts your delivery volume and auto-selects the most cost-effective provider mix
        </p>
      </div>

      {/* How it works banner */}
      <div style={{ background:"rgba(0,182,122,.06)", border:"1px solid rgba(0,182,122,.15)", borderRadius:12, padding:"14px 18px", marginBottom:24 }}>
        <div style={{ fontWeight:600, fontSize:13, color:C.g, marginBottom:6 }}>How it works</div>
        <div style={{ fontSize:12, color:C.st, lineHeight:1.7 }}>
          ZentraBite analyses your last 8 weeks of order history for each day of the week and predicts how many delivery orders you'll receive.
          Based on the prediction, it recommends the cheapest provider mix:
          <strong style={{ color:"#fff" }}> Uber Direct</strong> ($6.50/order) for low-volume days,
          <strong style={{ color:"#fff" }}> Tasker</strong> drivers ($180/day · handles up to 25 orders) for busy days,
          or a <strong style={{ color:"#fff" }}> mix of both</strong> when volume exceeds a single Tasker's capacity.
        </div>
      </div>

      {/* Date picker + detail */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:28 }}>

        {/* Date selector */}
        <div className="gs" style={{ padding:20 }}>
          <div style={{ fontWeight:600, fontSize:14, color:C.cl, marginBottom:14 }}>Check a specific date</div>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ width:"100%", marginBottom:0, boxSizing:"border-box" }}
          />
          {prediction && !loading && (
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:12, color:C.st, marginBottom:4 }}>{prediction.dayOfWeek} · {prediction.date}</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                <span style={{ fontFamily:"var(--font-outfit)", fontWeight:800, fontSize:28, color:C.cl }}>{prediction.predictedVolume}</span>
                <span style={{ fontSize:12, color:C.st }}>predicted deliveries</span>
              </div>
              <div style={{ fontSize:11, color:C.st, marginTop:2 }}>8-week median for {prediction.dayOfWeek}s · avg {prediction.historicalAverage}/day</div>
            </div>
          )}
          {loading && <div style={{ marginTop:14, fontSize:12, color:C.st }}>Calculating…</div>}
        </div>

        {/* Recommendation */}
        <div className="gs" style={{ padding:20, borderLeft:`3px solid ${providerColor}` }}>
          <div style={{ fontWeight:600, fontSize:14, color:C.cl, marginBottom:14 }}>Recommendation</div>
          {loading ? (
            <div style={{ fontSize:12, color:C.st }}>Loading…</div>
          ) : rec ? (
            <>
              <div style={{ display:"inline-block", padding:"4px 12px", borderRadius:20, background:`${providerColor}22`, color:providerColor, fontSize:12, fontWeight:700, marginBottom:12 }}>
                {PROVIDER_LABELS[rec.provider]}
              </div>

              {rec.taskersNeeded > 0 && (
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:20 }}>👷</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:C.cl }}>{rec.taskersNeeded} Tasker{rec.taskersNeeded > 1 ? "s" : ""}</div>
                    <div style={{ fontSize:11, color:C.st }}>Covers up to {rec.taskersNeeded * 25} orders</div>
                  </div>
                </div>
              )}

              {rec.uberOrders > 0 && (
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:20 }}>🚗</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:C.cl }}>Uber Direct</div>
                    <div style={{ fontSize:11, color:C.st }}>{rec.uberOrders} order{rec.uberOrders > 1 ? "s" : ""} · ${(rec.uberOrders * 6.5).toFixed(2)}</div>
                  </div>
                </div>
              )}

              <div style={{ borderTop:`1px solid ${C.mist}`, paddingTop:10, marginTop:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:12, color:C.st }}>Estimated cost</span>
                  <span style={{ fontWeight:700, fontSize:14, color:C.cl }}>${rec.estimatedCost.toFixed(2)}</span>
                </div>
                {rec.saving > 0 && (
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, color:C.st }}>Savings vs all-Uber</span>
                    <span style={{ fontWeight:700, fontSize:12, color:C.g }}>−${rec.saving.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div style={{ marginTop:12, padding:"10px 12px", background:"rgba(255,255,255,.03)", borderRadius:8, fontSize:11, color:C.st, lineHeight:1.6 }}>
                {rec.rationale}
              </div>
            </>
          ) : (
            <div style={{ fontSize:12, color:C.st }}>Select a date to see a recommendation</div>
          )}
        </div>
      </div>

      {/* 7-day plan */}
      <div>
        <div style={{ fontWeight:600, fontSize:15, color:C.cl, marginBottom:14 }}>7-Day Delivery Plan</div>
        {weekLoading ? (
          <div style={{ fontSize:12, color:C.st }}>Loading week plan…</div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:8 }}>
            {weekPlan.map((day, i) => {
              const dayRec = day.recommendation;
              const color  = PROVIDER_COLORS[dayRec.provider];
              const isToday = day.date === todayString();
              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(day.date)}
                  className="gs"
                  style={{
                    padding:"12px 10px", borderRadius:12, cursor:"pointer", textAlign:"center",
                    border:`1px solid ${selectedDate === day.date ? color : C.mist}`,
                    background: selectedDate === day.date ? `${color}18` : undefined,
                  }}
                >
                  <div style={{ fontSize:11, fontWeight:700, color:isToday?C.g:C.st, marginBottom:4 }}>
                    {isToday ? "Today" : day.dayOfWeek.slice(0,3)}
                  </div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginBottom:8 }}>
                    {day.date.slice(5)} {/* MM-DD */}
                  </div>
                  <div style={{ fontFamily:"var(--font-outfit)", fontWeight:800, fontSize:20, color:C.cl, marginBottom:4 }}>
                    {day.predictedVolume}
                  </div>
                  <div style={{ fontSize:9, color:C.st, marginBottom:8 }}>orders</div>
                  <div style={{ padding:"3px 0", borderRadius:6, background:`${color}22`, color, fontSize:9, fontWeight:700 }}>
                    {dayRec.provider === "none" ? "—" :
                     dayRec.provider === "uber_direct" ? "Uber" :
                     dayRec.provider === "tasker" ? `${dayRec.taskersNeeded}× Tasker` :
                     `${dayRec.taskersNeeded}T + Uber`}
                  </div>
                  <div style={{ fontSize:10, color:C.st, marginTop:6 }}>${dayRec.estimatedCost.toFixed(0)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical data table */}
      {prediction && prediction.historicalData.length > 0 && (
        <div style={{ marginTop:32 }}>
          <div style={{ fontWeight:600, fontSize:15, color:C.cl, marginBottom:12 }}>Historical Data — {prediction.dayOfWeek}s (last 8 weeks)</div>
          <div className="gs" style={{ overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${C.mist}` }}>
                  <th style={{ padding:"10px 16px", textAlign:"left", color:C.st, fontWeight:600 }}>Date</th>
                  <th style={{ padding:"10px 16px", textAlign:"right", color:C.st, fontWeight:600 }}>Orders</th>
                  <th style={{ padding:"10px 16px", textAlign:"right", color:C.st, fontWeight:600 }}>Cost if Uber only</th>
                  <th style={{ padding:"10px 16px", textAlign:"right", color:C.st, fontWeight:600 }}>Optimal cost</th>
                </tr>
              </thead>
              <tbody>
                {prediction.historicalData.map((row, i) => {
                  const uberCost = row.count * 6.5;
                  const taskersN = Math.ceil(row.count / 25);
                  const taskerCost = taskersN * 180;
                  const optimalCost = row.count <= 6 ? uberCost : Math.min(taskerCost, uberCost);
                  return (
                    <tr key={i} style={{ borderBottom:`1px solid ${C.mist}` }}>
                      <td style={{ padding:"10px 16px", color:C.cl }}>{row.date}</td>
                      <td style={{ padding:"10px 16px", textAlign:"right", color:C.cl, fontWeight:600 }}>{row.count}</td>
                      <td style={{ padding:"10px 16px", textAlign:"right", color:C.st }}>${uberCost.toFixed(2)}</td>
                      <td style={{ padding:"10px 16px", textAlign:"right", color:C.g, fontWeight:600 }}>${optimalCost.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:`1px solid rgba(255,255,255,.12)` }}>
                  <td colSpan={2} style={{ padding:"10px 16px", color:C.st, fontSize:11 }}>8-week average: {prediction.historicalAverage} orders/day · median: {prediction.predictedVolume}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
