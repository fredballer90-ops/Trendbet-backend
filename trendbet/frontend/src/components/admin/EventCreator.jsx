import React, { useState } from "react";
import api from "../../utils/api";

const initialForm = {
  title: "",
  description: "",
  category: "politics",
  startTime: "",
  endTime: "",
  options: [{ name: "Yes", probability: 50 }, { name: "No", probability: 50 }],
};                                                         
// Helper function for timestamp
const ts = () => new Date().toISOString();

const calculateOdds = (probability, totalProbability) => {
  const margin = 0.05; // house edge
  const inflatedProb = (probability / totalProbability) * (1 + margin);
  return (1 / inflatedProb).toFixed(2);
};

export default function EventCreator({ onCreated }) {
  const [formData, setFormData] = useState(initialForm);
  const totalProbability = formData.options.reduce((s, o) => s + Number(o.probability || 0), 0);
  const [loading, setLoading] = useState(false);

  const addOption = () => {
    setFormData({ ...formData, options: [...formData.options, { name: "", probability: 0 }] });
  };
  const removeOption = (i) => {
    const opts = formData.options.filter((_, idx) => idx !== i);
    setFormData({ ...formData, options: opts });
  };
  const updateOption = (i, field, value) => {
    const opts = [...formData.options];
    opts[i][field] = field === "probability" ? Number(value) : value;
    setFormData({ ...formData, options: opts });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalProbability !== 100) {
      alert("Total probability must equal 100%");
      return;
    }
    try {
      setLoading(true);

      // ✅ Use backend API instead of Firebase
      const optionsWithOdds = formData.options.map((opt) => ({
        name: opt.name,
        probability: Number(opt.probability),
        odds: calculateOdds(Number(opt.probability), totalProbability),
      }));

      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        startTime: formData.startTime || null,
        endTime: formData.endTime || null,
        options: optionsWithOdds,
        status: "open", // open, closed, resolved
        result: null, // option name when resolved
        createdAt: ts(),
      };

      // ✅ Send to backend API
      const response = await api.post('/api/admin/create-market', payload);

      setLoading(false);
      
      if (response.data.success) {
        alert("Event created with ID: " + response.data.marketId);
        setFormData(initialForm);
        if (onCreated) onCreated();
      } else {
        alert("Failed to create event: " + (response.data.error || "Unknown error"));
      }
    } catch (err) {
      setLoading(false);
      alert("Failed to create event: " + (err.response?.data?.error || err.message || err));
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", background: "#0b1220", padding: 18, borderRadius: 10, color: "#e6eef8" }}>
      <h2 style={{ marginBottom: 12 }}>Create New Event</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>Title</label>
            <input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #334155", background: "#071122", color: "#e6eef8" }} placeholder="e.g., Kenya Presidential Election 2027" />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6 }}>Category</label>
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #334155", background: "#071122", color: "#e6eef8" }}>
              <option value="politics">Politics</option>
              <option value="entertainment">Entertainment</option>
              <option value="sports">Sports</option>
              <option value="business">Business</option>
              <option value="social-media">Social Media</option>
              <option value="awards">Awards</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Description</label>
          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #334155", background: "#071122", color: "#e6eef8" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>Start Time</label>
            <input type="datetime-local" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #334155", background: "#071122", color: "#e6eef8" }} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>End Time</label>
            <input type="datetime-local" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #334155", background: "#071122", color: "#e6eef8" }} />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Options</h3>
            <button type="button" onClick={addOption} style={{ background: "#1f6feb", color: "white", padding: "6px 10px", borderRadius: 6, border: "none" }}>Add option</button>
          </div>

          {formData.options.map((opt, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input required placeholder="Option name" value={opt.name} onChange={(e) => updateOption(i, "name", e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #334155", background: "#071122", color: "#e6eef8" }} />
              <input required type="number" min="0" max="100" value={opt.probability} onChange={(e) => updateOption(i, "probability", e.target.value)} style={{ width: 110, padding: 8, borderRadius: 6, border: "1px solid #334155", background: "#071122", color: "#e6eef8" }} />
              <div style={{ width: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "#9fb8ff" }}>{calculateOdds(opt.probability, totalProbability)}x</div>
              {formData.options.length > 2 && <button type="button" onClick={() => removeOption(i)} style={{ background: "#ef4444", color: "white", padding: "6px 10px", borderRadius: 6, border: "none" }}>Remove</button>}
            </div>
          ))}

          <div style={{ marginTop: 6, background: "#071827", padding: 10, borderRadius: 8, border: "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>Total probability</div>
              <div style={{ color: totalProbability === 100 ? "#22c55e" : "#f97316" }}>{totalProbability}%</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <div>House edge</div>
              <div style={{ color: "#22c55e" }}>5%</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <button disabled={totalProbability !== 100 || loading} type="submit" style={{ width: "100%", background: totalProbability === 100 ? "#16a34a" : "#334155", color: "white", padding: "10px 12px", borderRadius: 8, border: "none" }}>
            {loading ? "Saving..." : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
