const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Example API routes
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Express on Hostinger!' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', NODE_ENV: process.env.NODE_ENV || 'development' });
});

// 1. Email Configuration with Fallbacks
const DEFAULT_EMAIL = 'support@rupesh.com';
const AUTH_EMAIL = process.env.AUTH_EMAIL || DEFAULT_EMAIL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || DEFAULT_EMAIL;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || DEFAULT_EMAIL;

const clientDist = path.join(__dirname, '..', 'client', 'dist');
const PATH_BASE = (process.env.VITE_PATH_BASE || '/live-app').replace(/\/$/, "");

// 2. Define the Maintenance/Coming Soon HTML Template
const maintenanceTemplate = (title, message) => `
  <div style="text-align: center; margin-top: 100px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333;">
    <h1 style="color: #d9534f;">${title}</h1>
    <p style="font-size: 1.2rem;">${message}</p>
    <div style="background: #f9f9f9; display: inline-block; padding: 20px; border-radius: 8px; margin-top: 20px; border: 1px solid #ddd;">
      <p><strong>Admin:</strong> ${ADMIN_EMAIL}</p>
      <p><strong>Support:</strong> ${SUPPORT_EMAIL}</p>
      <p><strong>Auth Support:</strong> ${AUTH_EMAIL}</p>
    </div>
    <p style="margin-top: 30px; color: #777;">&copy; 2026 Digital Wallet Service</p>
  </div>
`;

// 3. Routing Logic
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
    // SUCCESS: Build exists, serve the SPA
    console.log(`✅ Serving production build from: ${clientDist}`);
    app.use(PATH_BASE, express.static(clientDist));

    app.get('*', (req, res) => {
        if (req.path.includes("favicon.ico") ) {
            const svgIcon = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <text y=".9em" font-size="90">💰</text>
            </svg>
        `.trim();
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svgIcon);
        } else
        if (req.path.includes("assets") || req.path.includes("favicon") || req.path.includes("index-")) {
            res.sendFile(path.join(clientDist, req.path));
        } else
        if (req.path.startsWith(PATH_BASE)) {
            res.sendFile(path.join(clientDist, 'index.html'));
        } else {
            // Path doesn't match BASE_PATH
            console.log(req.path);
            res.status(200).send(maintenanceTemplate("Coming Soon", "This specific path is not yet active."+ PATH_BASE+ req.originalUrl));
        }
    });
} else {
    // FALLBACK: Build missing or in Development mode
    console.warn("⚠️ Client distribution folder NOT found or in Dev mode. Showing maintenance page.");
    
    app.get('*', (req, res) => {
        res.status(503).send(maintenanceTemplate(
            "Under Maintenance", 
            "We are currently updating our systems. Please visit after 2 days."
        ));
    });
}
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
});