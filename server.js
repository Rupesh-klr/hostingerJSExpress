const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure logs dir exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
 fs.mkdirSync(logsDir, { recursive: true });
}

app.get('/', (req, res) => {
 res.send('Hostinger Node app is running');
});

app.listen(PORT, () => {
 console.log(`Server is listening on port ${PORT}`);
});
