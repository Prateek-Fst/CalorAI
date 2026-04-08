import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid, Area, AreaChart,
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const styles = {
  page: {
    maxWidth: 1280,
    margin: '0 auto',
    padding: '40px 32px 60px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 36,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 14 },
  logo: {
    width: 44, height: 44, borderRadius: 12,
    background: 'linear-gradient(135deg, #6366f1, #ec4899)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, fontWeight: 800, color: '#fff',
    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
  },
  title: { fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: 13, color: '#8b91a8', margin: '2px 0 0' },
  liveBadge: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    padding: '8px 16px', borderRadius: 999,
    fontSize: 12, fontWeight: 600, color: '#10b981',
  },
  pulse: {
    width: 8, height: 8, borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.6)',
    animation: 'pulse 2s infinite',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 20,
    marginBottom: 28,
  },
  kpi: {
    background: 'linear-gradient(140deg, rgba(20, 26, 47, 0.9), rgba(13, 17, 32, 0.6))',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 24,
    backdropFilter: 'blur(20px)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.2s, border-color 0.2s',
  },
  kpiAccent: (color) => ({
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    background: `linear-gradient(90deg, ${color}, transparent)`,
  }),
  kpiLabel: { fontSize: 12, color: '#8b91a8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 },
  kpiValue: { fontSize: 36, fontWeight: 800, margin: '8px 0 0', letterSpacing: '-0.03em' },
  kpiIcon: { fontSize: 22, opacity: 0.8 },
  card: {
    background: 'linear-gradient(140deg, rgba(20, 26, 47, 0.9), rgba(13, 17, 32, 0.6))',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 28,
    backdropFilter: 'blur(20px)',
    marginBottom: 24,
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  cardTitle: { fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' },
  cardSubtitle: { fontSize: 12, color: '#8b91a8', margin: '4px 0 0' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  tooltip: {
    background: 'rgba(5, 7, 15, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
  },
};

const keyframes = `
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
    70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
    100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fade-in { animation: fadeInUp 0.5s ease-out both; }
`;

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={styles.tooltip}>
      {label && <div style={{ color: '#8b91a8', marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#fff', fontWeight: 600 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

async function fetchJson(url) {
  const r = await fetch(url);
  return r.json();
}

export default function App() {
  const [daily, setDaily] = useState([]);
  const [ab, setAb] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [summary, setSummary] = useState({});

  async function load() {
    try {
      const [d, a, f, s] = await Promise.all([
        fetchJson('/api/analytics/meals-daily'),
        fetchJson('/api/analytics/ab-distribution'),
        fetchJson('/api/analytics/onboarding-funnel'),
        fetchJson('/api/analytics/summary'),
      ]);
      setDaily(d); setAb(a); setFunnel(f); setSummary(s);
    } catch (e) { console.warn(e); }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const kpis = [
    { label: 'Total Users', value: summary.totalUsers, icon: '👥', color: '#6366f1' },
    { label: 'Total Meals', value: summary.totalMeals, icon: '🍽️', color: '#10b981' },
    { label: 'Events Logged', value: summary.totalEvents, icon: '⚡', color: '#f59e0b' },
    { label: 'Blocked Users', value: summary.blocked, icon: '🚫', color: '#ef4444' },
  ];

  return (
    <div style={styles.page}>
      <style>{keyframes}</style>

      <header style={styles.header} className="fade-in">
        <div style={styles.brand}>
          <div style={styles.logo}>C</div>
          <div>
            <h1 style={styles.title}>CalorAI Analytics</h1>
            <p style={styles.subtitle}>Real-time insights from your Telegram bot</p>
          </div>
        </div>
        <div style={styles.liveBadge}>
          <span style={styles.pulse}></span>
          LIVE · refresh 5s
        </div>
      </header>

      <div style={styles.kpiGrid} className="fade-in">
        {kpis.map((k) => (
          <div key={k.label} style={styles.kpi}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
          >
            <div style={styles.kpiAccent(k.color)}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={styles.kpiLabel}>{k.label}</div>
                <div style={styles.kpiValue}>{k.value ?? '—'}</div>
              </div>
              <div style={styles.kpiIcon}>{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.card} className="fade-in">
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>Daily Meal Logs</h3>
            <p style={styles.cardSubtitle}>Last 7 days of activity</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="mealGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#8b91a8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#8b91a8" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3}
              fill="url(#mealGradient)" dot={{ fill: '#6366f1', r: 5, strokeWidth: 0 }}
              activeDot={{ r: 7, fill: '#fff', stroke: '#6366f1', strokeWidth: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.twoCol}>
        <div style={styles.card} className="fade-in">
          <div style={styles.cardHeader}>
            <div>
              <h3 style={styles.cardTitle}>A/B Test Distribution</h3>
              <p style={styles.cardSubtitle}>Control vs Test allocation</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={ab} dataKey="users" nameKey="group" innerRadius={60} outerRadius={95}
                paddingAngle={4} stroke="none">
                {ab.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 13, color: '#e6e9f2' }} />
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.card} className="fade-in">
          <div style={styles.cardHeader}>
            <div>
              <h3 style={styles.cardTitle}>Onboarding Funnel</h3>
              <p style={styles.cardSubtitle}>Test group progression</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={funnel} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="funnelGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <XAxis dataKey="stage" stroke="#8b91a8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#8b91a8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="users" fill="url(#funnelGradient)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
