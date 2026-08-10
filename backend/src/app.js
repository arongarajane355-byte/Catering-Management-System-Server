const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middlewares/errorHandler');
const { pool } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const staffRoutes = require('./routes/staffRoutes');
const adminRoutes = require('./routes/adminRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const path = require('path');

const app = express();
const SERVER_START = Date.now();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── ROOT STATUS PAGE ──────────────────────────────────────────────────
app.get('/', async (req, res) => {
  let dbStatus = 'connected';
  let dbLatency = 0;
  let dbInfo = {};

  try {
    const t0 = Date.now();
    const conn = await pool.getConnection();
    const [[row]] = await conn.query(
      'SELECT VERSION() AS version, DATABASE() AS db_name, NOW() AS server_time'
    );
    dbLatency = Date.now() - t0;
    dbInfo = row;
    conn.release();
  } catch (err) {
    dbStatus = 'error';
    dbInfo = { error: err.message };
  }

  const uptimeMs = Date.now() - SERVER_START;
  const uptimeSecs = Math.floor(uptimeMs / 1000);
  const uptimeStr = (() => {
    const h = Math.floor(uptimeSecs / 3600);
    const m = Math.floor((uptimeSecs % 3600) / 60);
    const s = uptimeSecs % 60;
    return `${h}h ${m}m ${s}s`;
  })();

  const endpoints = [
    { method: 'POST', path: '/api/auth/login',         desc: 'Authenticate user & get JWT token' },
    { method: 'POST', path: '/api/auth/register',      desc: 'Customer self-registration (public)' },
    { method: 'GET',  path: '/api/auth/me',            desc: 'Get authenticated user profile' },
    { method: 'GET',  path: '/api/admin/summary',      desc: 'Admin dashboard stats' },
    { method: 'GET',  path: '/api/admin/pending-verifications', desc: 'Pending customer accounts' },
    { method: 'POST', path: '/api/admin/verify-customer', desc: 'Approve / reject customer account' },
    { method: 'GET',  path: '/api/admin/users',        desc: 'List all users (staff & customers)' },
    { method: 'POST', path: '/api/admin/users',        desc: 'Create user account' },
    { method: 'PUT',  path: '/api/admin/user-status',  desc: 'Toggle user active/inactive' },
    { method: 'GET',  path: '/api/services',           desc: 'List all services' },
    { method: 'GET',  path: '/api/services/grouped',   desc: 'Services grouped by category' },
    { method: 'GET',  path: '/api/services/categories',desc: 'List service categories' },
    { method: 'POST', path: '/api/services',           desc: 'Create a new service' },
    { method: 'GET',  path: '/api/bookings',           desc: 'List bookings' },
    { method: 'POST', path: '/api/bookings',           desc: 'Create a booking' },
    { method: 'GET',  path: '/api/payments',           desc: 'List payments' },
    { method: 'POST', path: '/api/payments',           desc: 'Record a payment' },
    { method: 'GET',  path: '/api/customer/dashboard', desc: 'Customer dashboard data' },
    { method: 'PUT',  path: '/api/customer/profile',   desc: 'Update customer profile' },
    { method: 'GET',  path: '/api/staff/bookings',     desc: 'Staff booking list' },
    { method: 'GET',  path: '/api/health',             desc: 'Simple health ping' },
  ];

  const methodColors = {
    GET:    { bg: '#0ea5e9', dim: 'rgba(14,165,233,0.15)' },
    POST:   { bg: '#22c55e', dim: 'rgba(34,197,94,0.15)'  },
    PUT:    { bg: '#f59e0b', dim: 'rgba(245,158,11,0.15)' },
    DELETE: { bg: '#ef4444', dim: 'rgba(239,68,68,0.15)'  },
    PATCH:  { bg: '#a855f7', dim: 'rgba(168,85,247,0.15)' },
  };

  const endpointRows = endpoints.map(e => {
    const mc = methodColors[e.method] || { bg: '#94a3b8', dim: 'rgba(148,163,184,0.15)' };
    return `
      <tr class="ep-row">
        <td>
          <span class="method-badge" style="background:${mc.dim};color:${mc.bg};border:1px solid ${mc.bg}30">
            ${e.method}
          </span>
        </td>
        <td><code class="ep-path">${e.path}</code></td>
        <td class="ep-desc">${e.desc}</td>
      </tr>`;
  }).join('');

  const dbStatusColor  = dbStatus === 'connected' ? '#22c55e' : '#ef4444';
  const dbStatusDim    = dbStatus === 'connected' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
  const dbStatusLabel  = dbStatus === 'connected' ? '● Connected' : '● Error';
  const latencyColor   = dbLatency < 20 ? '#22c55e' : dbLatency < 100 ? '#f59e0b' : '#ef4444';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CaterMS API — Status</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #080c14;
      --surface: #0f1623;
      --surface2: #131c2e;
      --border: rgba(255,255,255,0.07);
      --brand: #6366f1;
      --brand-dim: rgba(99,102,241,0.12);
      --text: #f1f5f9;
      --text-muted: #64748b;
      --text-subtle: #94a3b8;
      --green: #22c55e;
      --green-dim: rgba(34,197,94,0.1);
      --r: 12px;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 0;
      overflow-x: hidden;
    }

    /* ── Animated grid background ── */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
      z-index: 0;
    }

    /* ── Top glow ── */
    body::after {
      content: '';
      position: fixed;
      top: -200px;
      left: 50%;
      transform: translateX(-50%);
      width: 800px;
      height: 400px;
      background: radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    .page { position: relative; z-index: 1; max-width: 980px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }

    /* ── HEADER ── */
    .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; margin-bottom: 2.5rem; flex-wrap: wrap; }
    .header-left { display: flex; align-items: center; gap: 1rem; }
    .logo-ring {
      width: 52px; height: 52px; border-radius: 14px;
      background: linear-gradient(135deg, var(--brand), #818cf8);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem;
      box-shadow: 0 0 30px rgba(99,102,241,0.4);
    }
    .api-title { font-size: 1.7rem; font-weight: 800; letter-spacing: -0.5px; }
    .api-version {
      display: inline-block; margin-left: 0.5rem;
      font-size: 0.7rem; font-weight: 600; letter-spacing: 0.05em;
      background: var(--brand-dim); color: var(--brand);
      border: 1px solid rgba(99,102,241,0.3);
      padding: 2px 8px; border-radius: 999px; vertical-align: middle;
    }
    .api-subtitle { color: var(--text-muted); font-size: 0.875rem; margin-top: 0.2rem; }

    .live-badge {
      display: flex; align-items: center; gap: 0.5rem;
      background: var(--green-dim); border: 1px solid rgba(34,197,94,0.25);
      color: var(--green); border-radius: 999px; padding: 0.4rem 1rem;
      font-size: 0.8rem; font-weight: 600; white-space: nowrap;
      animation: badge-pulse 2s ease-in-out infinite;
    }
    .live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); animation: dot-blink 1.2s ease-in-out infinite; }
    @keyframes dot-blink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
    @keyframes badge-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.3)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0)} }

    /* ── STAT CARDS ── */
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.75rem; }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 1.25rem 1.5rem;
      position: relative; overflow: hidden;
      transition: border-color 0.2s, transform 0.2s;
    }
    .card:hover { border-color: rgba(99,102,241,0.35); transform: translateY(-2px); }
    .card::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(99,102,241,0.04),transparent); pointer-events:none; }
    .card-icon { font-size: 1.25rem; margin-bottom: 0.625rem; }
    .card-label { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.35rem; }
    .card-value { font-size: 1.25rem; font-weight: 700; color: var(--text); }
    .card-sub { font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem; }

    /* DB card special */
    .card-db .card-value { font-size: 1rem; }

    /* ── SECTION TITLE ── */
    .section-title {
      font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; color: var(--text-muted);
      display: flex; align-items: center; gap: 0.5rem;
      margin-bottom: 0.875rem;
    }
    .section-title::after { content:''; flex:1; height:1px; background:var(--border); }

    /* ── ENDPOINT TABLE ── */
    .table-wrap {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r); overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: var(--surface2); }
    th { padding: 0.75rem 1.25rem; text-align: left; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
    .ep-row { border-top: 1px solid var(--border); transition: background 0.15s; }
    .ep-row:hover { background: rgba(99,102,241,0.04); }
    td { padding: 0.7rem 1.25rem; vertical-align: middle; }

    .method-badge {
      display: inline-block; padding: 2px 8px; border-radius: 5px;
      font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; font-weight: 600;
      letter-spacing: 0.05em; white-space: nowrap;
    }
    code.ep-path {
      font-family: 'JetBrains Mono', monospace; font-size: 0.78rem;
      color: #c4b5fd; background: rgba(196,181,253,0.07);
      padding: 2px 7px; border-radius: 5px; white-space: nowrap;
    }
    .ep-desc { font-size: 0.82rem; color: var(--text-subtle); }

    /* ── FOOTER ── */
    .footer { margin-top: 2.5rem; text-align: center; font-size: 0.76rem; color: var(--text-muted); }
    .footer a { color: var(--brand); text-decoration: none; }

    /* ── DB INFO BOX ── */
    .db-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.625rem; }
    .db-kv { font-size: 0.75rem; }
    .db-kv .k { color: var(--text-muted); }
    .db-kv .v { color: var(--text); font-family: 'JetBrains Mono', monospace; font-size: 0.73rem; }

    @media (max-width: 600px) {
      .header { flex-direction: column; }
      .cards { grid-template-columns: 1fr 1fr; }
      .db-info-grid { grid-template-columns: 1fr; }
      th:last-child, td:last-child { display: none; }
    }

    /* ── Fade-in animation ── */
    .page { animation: fade-in 0.4s ease; }
    @keyframes fade-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <header class="header">
    <div class="header-left">
      <div class="logo-ring">🍽️</div>
      <div>
        <div class="api-title">CaterMS API <span class="api-version">v1.0</span></div>
        <div class="api-subtitle">Catering Management System — Backend REST API</div>
      </div>
    </div>
    <div class="live-badge">
      <span class="live-dot"></span> API Online
    </div>
  </header>

  <!-- STAT CARDS -->
  <div class="cards">
    <!-- DB Status -->
    <div class="card card-db">
      <div class="card-icon">🗄️</div>
      <div class="card-label">Database</div>
      <div class="card-value">
        <span style="color:${dbStatusColor};font-size:0.85rem;">${dbStatusLabel}</span>
      </div>
      <div class="db-info-grid">
        ${dbStatus === 'connected' ? `
        <div class="db-kv"><span class="k">Host </span><span class="v">${process.env.DB_HOST || 'localhost'}</span></div>
        <div class="db-kv"><span class="k">DB </span><span class="v">${dbInfo.db_name || process.env.DB_NAME}</span></div>
        <div class="db-kv"><span class="k">MySQL </span><span class="v">${dbInfo.version || '—'}</span></div>
        <div class="db-kv"><span class="k">Latency </span><span class="v" style="color:${latencyColor}">${dbLatency}ms</span></div>
        ` : `<div class="db-kv" style="grid-column:1/-1"><span class="v" style="color:#ef4444">${dbInfo.error}</span></div>`}
      </div>
    </div>

    <!-- Uptime -->
    <div class="card">
      <div class="card-icon">⏱️</div>
      <div class="card-label">Server Uptime</div>
      <div class="card-value">${uptimeStr}</div>
      <div class="card-sub">Since last restart</div>
    </div>

    <!-- Environment -->
    <div class="card">
      <div class="card-icon">🌐</div>
      <div class="card-label">Environment</div>
      <div class="card-value" style="font-size:1rem">${process.env.NODE_ENV || 'development'}</div>
      <div class="card-sub">Port ${process.env.PORT || 5000}</div>
    </div>

    <!-- Endpoints -->
    <div class="card">
      <div class="card-icon">🔗</div>
      <div class="card-label">Endpoints</div>
      <div class="card-value">${endpoints.length}</div>
      <div class="card-sub">Registered routes</div>
    </div>
  </div>

  <!-- DB SERVER TIME -->
  ${dbStatus === 'connected' ? `
  <div class="cards" style="grid-template-columns:1fr;margin-bottom:1.75rem">
    <div class="card" style="padding:0.875rem 1.25rem">
      <div style="display:flex;align-items:center;gap:0.625rem;font-size:0.8rem;color:var(--text-muted)">
        <span style="color:${dbStatusColor}">●</span>
        <span>MySQL connected at <strong style="color:var(--text);font-family:'JetBrains Mono',monospace;font-size:0.78rem">${dbInfo.server_time}</strong></span>
        <span style="margin-left:auto;color:${latencyColor};font-family:'JetBrains Mono',monospace;font-size:0.76rem">ping ${dbLatency}ms</span>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- ENDPOINTS -->
  <div class="section-title">📡 API Endpoints</div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th style="width:80px">Method</th>
          <th>Path</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>${endpointRows}</tbody>
    </table>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <p>CaterMS Backend &nbsp;•&nbsp; Built with Node.js + Express + MySQL2 &nbsp;•&nbsp; ${new Date().getFullYear()}</p>
    <p style="margin-top:0.375rem">
      <a href="/api/health">/api/health</a> &nbsp;|&nbsp;
      <a href="/api/services/grouped">/api/services/grouped</a>
    </p>
  </div>

</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});
// ─────────────────────────────────────────────────────────────────────

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CMS Backend API is running', uptime: `${Math.floor((Date.now() - SERVER_START) / 1000)}s` });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;

