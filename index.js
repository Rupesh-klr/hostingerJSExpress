const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { createProxyMiddleware } = require('http-proxy-middleware');
const net = require('net');

// ... your existing express setup ...
// const javaApp = spawn('java', [
//     '-jar', 
//     path.join(__dirname, 'java-apps', 'india-0.0.1-SNAPSHOT.jar'),
//     '--server.port=8081'
// ]);
const isPortBusy = (port) => {
    return new Promise((resolve) => {
        const server = net.createServer()
            .once('error', (err) => {
                if (err.code === 'EADDRINUSE') resolve(true); // Port is taken
                else resolve(false);
            })
            .once('listening', () => {
                server.close();
                resolve(false); // Port is free
            })
            .listen(port);
    });
};

const app = express();

const SPRING_PORT = process.env.PORT || 8088;


// Replace this with the EXACT path you found using 'pwd' in your bin folder
const JAVA_EXE = '/home/u115817599/domains/common-zip/jdk-23.0.2/bin/java';
const JAR_PATH = path.join(process.cwd(), 'java-apps/india-0.0.1-SNAPSHOT.jar');

// Optimized arguments for Shared Hosting
const JAVA_ARGS = [
    '-Xmx256m',               // Limit Heap memory to 256MB
    '-Xms128m',               // Start with 128MB
    '-Xss512k',               // HALVE the memory used by each thread stack (Saves native memory)
    '-XX:+UseSerialGC',       // IMPORTANT: Use 1 thread for GC instead of 8+
    '-XX:CICompilerCount=2',   // Limit JIT compiler threads
    '-jar', JAR_PATH,
    '--server.port='+ SPRING_PORT,
    '--server.tomcat.threads.max=10',  // Limit Tomcat worker threads
    '--server.tomcat.threads.min-spare=2'
];
// const JAVA_ARGS = [
//     '-Xmx256m',               // Limit Max Heap to 256MB
//     '-Xms128m',               // Start with 128MB
//     '-Xss512k',               // Reduce thread stack size from 1MB to 512KB (saves RAM)
//     '-XX:+UseSerialGC',       // Use Serial GC (stops "Failed to start GC Thread" errors)
//     '-XX:ParallelGCThreads=1', // Force only 1 thread for GC
//     '-XX:CICompilerCount=2',   // Reduce threads used for compiling code
//     '-jar', JAR_PATH,
//     '--server.port=' + SPRING_PORT
// ];
// let javaApp = null;
let javaApp = null;
let isJavaStarting = false;

// Helper function to check if the Java port is alive
const checkJavaHealth = async () => {
    try {
        const response = await fetch(`http://localhost:${SPRING_PORT}/actuator/health`);
        return response.ok;
    } catch (err) {
        return false;
    }
};
const startJavaProcess = async () => {
    try{
        const busy = await isPortBusy(SPRING_PORT);
    
    if (busy) {
        console.log(`⚠️ Port ${SPRING_PORT} is already busy. Skipping Java spawn...`);
        console.log(`🔗 Node will attempt to proxy to the existing process on this port.`);
        return; // Exit function, don't start a second JAR
    }
return new Promise((resolve) => {
        console.log(`🚀 Port ${SPRING_PORT} is free. Starting Java...`);
        
        javaApp = spawn(JAVA_EXE, JAVA_ARGS, { stdio: 'pipe', cwd: process.cwd() });

        // Set a safety timeout: if Java takes > 15 seconds, move on anyway
        const safetyTimer = setTimeout(() => {
            console.log("⏱️ 10s passed: Moving to next extension...");
            resolve();
        }, 10000);

        javaApp.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[Spring Boot]: ${output}`);

            // If we see the success message, resolve early!
            if (output.includes("Started IndiaApplication") || output.includes("JVM running for")) {
                console.log("✅ Java is Ready! Proceeding...");
                clearTimeout(safetyTimer);
                resolve();
            }
        });

        javaApp.on('error', (err) => {
            console.error('❌ Java failed to start:', err.message);
            clearTimeout(safetyTimer);
            resolve(); // Resolve anyway so Node doesn't hang forever
        });
    });
    // if (javaApp || isJavaStarting) return;
    //     // if (javaApp || isJavaStarting) return; // Prevent multiple spawns
        
    //     isJavaStarting = true;
    //     console.log(`🚀 Port ${SPRING_PORT} is free. Starting Java Singleton...`);
    //     console.log('🚀 Kicking off Singleton Java Process...');
    
    //     javaApp = spawn(JAVA_EXE, JAVA_ARGS, { stdio: 'pipe', cwd: process.cwd() });
    
    //     javaApp.on('error', (err) => {
    //         console.error('❌ Java Start Error:', err.message);
    //         javaApp = null;
    //         isJavaStarting = false;
    //     });
    
    //     javaApp.stdout.on('data', (data) => {
    //         const output = data.toString();
    //         console.log(`[Spring Boot]: ${output}`);
    //         // Once we see "Started" in the logs, we know it's ready
    //         if (output.includes("Started")) {
    //             isJavaStarting = false;
    //         }
    //     });
    
    //     javaApp.on('close', (code) => {
    //         console.log(`[System] Java process stopped (Code: ${code})`);
    //         javaApp = null;
    //         isJavaStarting = false;
    //     });
        } catch (globalErr) {
        // This catches immediate failures like invalid arguments or sync issues
        console.error('🔥 Critical Failure during Java Spawn:', globalErr.message);
    }
};

async function initServer() {
    try {
        // 1. Start the first Java JAR
        console.log("Step 1: Starting Spring-App-1...");
        await startJavaProcess(); 

        // 2. Optional: Hard 10-second delay if you want to be extra safe
        // await new Promise(res => setTimeout(res, 10000));

        // 3. Start your Next Extension / Second Spawn
        console.log("Step 2: Starting Next Extension...");
        // spawnNextExtension(); 

    } catch (err) {
        console.error("Initialization failed:", err);
    }
}

initServer();
// try {
//     console.log('🚀 Initializing Java Process...');
    
//     // 1. Spawn the process (Remove 'inherit' to keep stdout/stderr accessible)
//     javaApp = spawn(JAVA_EXE, JAVA_ARGS, { 
//         stdio: 'pipe', // This ensures javaApp.stdout is NOT null
//         cwd: process.cwd() 
//     });

//     // 2. Safely attach the error listener
//     if (javaApp) {
//         javaApp.on('error', (err) => {
//             console.error('❌ Process Level Error:', err.message);
//         });

//         // 3. Independent check for stdout (Output)
//         if (javaApp.stdout) {
//             javaApp.stdout.on('data', (data) => {
//                 console.log(`[Spring Boot]: ${data}`);
//             });
//         }

//         // 4. Independent check for stderr (Errors)
//         if (javaApp.stderr) {
//             javaApp.stderr.on('data', (data) => {
//                 console.error(`[Java Error]: ${data}`);
//             });
//         }
        
//         javaApp.on('close', (code) => {
//             console.log(`[System] Java process exited with code ${code}`);
//         });
//     }

// } catch (globalErr) {
//     // This catches immediate failures like invalid arguments or sync issues
//     console.error('🔥 Critical Failure during Java Spawn:', globalErr.message);
// }

// const jarPath = path.join(process.cwd(), 'java-apps/india-0.0.1-SNAPSHOT.jar');
// const javaApp = spawn('java', ['-jar', jarPath, '--server.port=' + SPRING_PORT]);

// javaApp.stdout.on('data', (data) => {
//     console.log(`[Spring Boot]: ${data}`);
// });
// // javaApp.stdout.on('data', (data) => {
// //     console.log(`[Java Spring]: ${data}`);
// // });

// javaApp.stderr.on('data', (data) => {
//     console.error(`[Java Error]: ${data}`);
// });


// Proxy Logic: Forward /spring-app1 requests to the Spring Boot JAR
app.use('/spring-app1', async (req, res, next) => {
    // If Java is dead, try to start it
    if (!javaApp) {
        startJavaProcess();
        return res.status(503).send("Backend is initializing... please refresh in 10 seconds.");
    }
    next();
},createProxyMiddleware({
    target: 'http://localhost:' + SPRING_PORT,
    changeOrigin: true,
    pathRewrite: {
        '^/spring-app1': '', // Removes '/spring-app1' before sending to Java
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`[Proxy] Routing ${req.method} ${req.url}`);
        console.log(`[Proxy] Forwarded: ${req.url} -> Status: ${proxyRes.statusCode}`);
    }
}));
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
// Ensure logs directory exists to prevent crash
// const logDir = 'logs';
// 1. Define the absolute path to the logs folder at the PROJECT ROOT
const logDir = path.join(process.cwd(), 'logs');
const logFileName = 'app.log';
const logFilePath = path.join(logDir, logFileName);

// 2. Ensure the directory exists in the root
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}
// const logFileName = 'app.log';

if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const formatLog = (level, args) => {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    return `[${timestamp}] [${level}] ${message}\n`;
};

const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
console.log = (...args) => logStream.write(formatLog('INFO', args));
console.error = (...args) => logStream.write(formatLog('ERROR', args));
console.warn = (...args) => logStream.write(formatLog('WARN', args));

// Example API routes
app.get('/api/hello', (req, res) => { 
    console.log(`Logging to ${req.path}`);
  res.json({ message: 'Hello from Express on Hostinger!' });
});
app.get('/api/shutdownport', async (req, res) => {
    const port = req.query.portShutdown;

    if (!port) {
        return res.status(400).send("❌ Please provide a portShutdown parameter (e.g., ?portShutdown=8081)");
    }

    console.log(`⚠️ Manual shutdown requested for port: ${port}`);

    // Linux command to find the process on that port and KILL it (-k)
    // /tcp ensures we only target the network process
    const killCommand = `fuser -k ${port}/tcp`;

    exec(killCommand, (error, stdout, stderr) => {
        // Note: fuser returns a non-zero code if it kills something, 
        // so we check if the command executed rather than just the error object.
        if (stderr && !stderr.includes("Specified filename")) {
            console.error(`Error executing shutdown: ${stderr}`);
            return res.status(500).send(`❌ Failed to shutdown port ${port}`);
        }

        console.log(`✅ Port ${port} has been cleared.`);
        
        // If the port killed was our main Spring app, reset our local tracking variables
        if (port == SPRING_PORT) {
            javaApp = null;
            isJavaStarting = false;
            await initServer();
        }

        res.send(`<h1>Success</h1><p>Process on port <b>${port}</b> has been terminated.</p>`);
    });
});
app.get('/api/health', (req, res) => {
    console.log(`Logging to ${req.path} Log file not found at ${logFilePath}`);
  res.json({ status: 'ok', NODE_ENV: process.env.NODE_ENV || 'development' });
});
/**
 * Efficiently reads the last N lines of a file without loading the whole file into memory.
 */
function tailFile(filePath, lineCount) {
    const STATS = fs.statSync(filePath);
    const FILE_SIZE = STATS.size;
    const BUFFER_SIZE = 1024 * 64; // Read 64KB chunks
    let fd = fs.openSync(filePath, 'r');
    let lines = '';
    let cursor = FILE_SIZE;

    // Read backwards in chunks until we have enough lines
    while (lines.split('\n').length <= lineCount && cursor > 0) {
        let length = Math.min(BUFFER_SIZE, cursor);
        cursor -= length;
        let buffer = Buffer.alloc(length);
        fs.readSync(fd, buffer, 0, length, cursor);
        lines = buffer.toString('utf8') + lines;
    }

    fs.closeSync(fd);
    return lines.split('\n').slice(-lineCount).join('\n');
}
// 2. The Log Viewer Page
app.get('/lastlog', (req, res) => {

    console.log(`Logging to ${req.path}`);
    const offset = parseInt(req.query.offset) || 500;

    if (!fs.existsSync(logFilePath)) {
        fs.mkdirSync(logDir);
        const logStream_NEW = fs.createWriteStream(logFilePath, { flags: 'a' });
        console.log = (...args) => logStream_NEW.write(formatLog('INFO', args));
        console.error = (...args) => logStream_NEW.write(formatLog('ERROR', args));
        console.warn = (...args) => logStream_NEW.write(formatLog('WARN', args));
        return res.status(404).send(`<h1> Log file not found at ${logFilePath}; No log file found yet. under main directory.</h1>`);
    }

    // Read the file and get last 500 lines
    // const logs = fs.readFileSync(logFilePath, 'utf8').split('\n');
    // const last500 = logs.slice(-500).join('\n');

    // Simple HTML Template with Refresh and Previous buttons
    try {
        // Only the requested lines are processed in memory
        const lastLines = tailFile(logFilePath, offset);

        res.send(`
            <html>
            <head>
                <title>Log Viewer</title>
                <style>
                    body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
                    pre { background: #000; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; }
                    .controls { margin-bottom: 20px; position: sticky; top: 0; background: #1e1e1e; padding: 10px; }
                    button { padding: 10px 20px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 3-px; }
                    button:hover { background: #0056b3; }
                </style>
            </head>
                <body style="background:#121212; color:#00ff00; font-family:monospace; padding:20px;">
                <h2>Last ${offset + 500} Log Entries:</h2>
                    <div style="position:sticky; top:0; background:#222; padding:10px; border-bottom:1px solid #444;">
                        <button onclick="location.reload()">🔄 Refresh (Last 500)</button>
                        <button onclick="location.href='?offset=${offset + 500}'">Load More (Older)⬅️ Previous 500 Lines</button>
                    </div>
                    <pre style="white-space: pre-wrap;">${lastLines}</pre>
                     <script>
                    // Auto-scroll to bottom of logs on load
                    window.scrollTo(0, document.body.scrollHeight);
                </script>
                </body>
            </html>
        `);
    } catch (err) {
        res.status(500).send("Error reading logs: " + err.message);
    }
    // res.send(`
    //     <html>
    //         <head>
    //             <title>Log Viewer</title>
    //             <style>
    //                 body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
    //                 pre { background: #000; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; }
    //                 .controls { margin-bottom: 20px; position: sticky; top: 0; background: #1e1e1e; padding: 10px; }
    //                 button { padding: 10px 20px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 3-px; }
    //                 button:hover { background: #0056b3; }
    //             </style>
    //         </head>
    //         <body>
    //             <div class="controls">
    //                 <button onclick="window.location.reload()">🔄 Refresh (Last 500)</button>
    //                 <button onclick="alert('Previous 500 lines logic triggered')">⬅️ Previous 500 Lines</button>
    //             </div>
    //             <h2>Last 500 Log Entries:</h2>
    //             <pre>${last500 || 'Log is empty...'}</pre>
    //             <script>
    //                 // Auto-scroll to bottom of logs on load
    //                 window.scrollTo(0, document.body.scrollHeight);
    //             </script>
    //         </body>
    //     </html>
    // `);
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
    <h1>sorry (((::)))</h1>
    <!-- <p style="font-size: 1.2rem;">${message}</p> -->
    <p style="margin-top: 30px; color: #777;">&copy; 2026 Digital Wallet Service</p>
  </div>
`;

// 3. Routing Logic
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
  
    // SUCCESS: Build exists, serve the SPA
    console.log(`✅ Serving production build from: ${clientDist}`);
    app.use(PATH_BASE, express.static(clientDist));

    app.get('*', (req, res) => {

console.log(`Logging to ${req.path}`);
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

console.log(`Under Maintenance ${req.path}`);
        res.status(503).send(maintenanceTemplate(
            "Under Maintenance" + req.path + `Env:- ${process.env.NODE_ENV} ; ${process.env.NODE_ENV === 'production'}; clientFileEsists:- ${fs.existsSync(clientDist)} FilePath:- ${clientDist}`, 
            "We are currently updating our systems. Please visit after 2 days."+req.path
        ));
    });
}
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
});
