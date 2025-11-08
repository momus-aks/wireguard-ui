const express = require('express');
const cors = require('cors');
const { exec, execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const app = express();
const PORT = 3001;

// Configure CORS to allow requests from the frontend
// Allow requests from any origin (for network access from other machines)
app.use(cors({
  origin: true, // Allow all origins when accessed via network
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Store interface status
const interfaceStatus = {
  A: { isConnected: false },
  B: { isConnected: false }
};

// Store previous stats for rate calculation
const previousStats = {
  A: { bytesReceived: 0, bytesSent: 0, timestamp: 0 },
  B: { bytesReceived: 0, bytesSent: 0, timestamp: 0 }
};

// Helper function to get interface name
function getInterfaceName(machine) {
  return machine === 'A' ? 'wg0' : 'wg1';
}

// POST /api/up - Bring interface up
app.post('/api/up', async (req, res) => {
  try {
    const { machine, config } = req.body;
    
    if (!machine || !config) {
      return res.status(400).json({ error: 'Machine and config are required' });
    }

    if (machine !== 'A' && machine !== 'B') {
      return res.status(400).json({ error: 'Machine must be A or B' });
    }

    const interfaceName = getInterfaceName(machine);
    
    // Write config to /etc/wireguard/ where wg-quick expects it
    const wireguardDir = '/etc/wireguard';
    const configPath = `${wireguardDir}/${interfaceName}.conf`;
    
    // Write config to a temp file first, then move it with sudo
    const tempPath = path.join(__dirname, `wg${machine.toLowerCase()}.conf.tmp`);
    fs.writeFileSync(tempPath, config, 'utf8');
    
    // Ensure /etc/wireguard/ directory exists, then copy config with sudo
    try {
      // Create directory if it doesn't exist (with sudo)
      await execAsync(`sudo mkdir -p ${wireguardDir} && sudo chmod 755 ${wireguardDir}`, {
        cwd: __dirname,
        env: { ...process.env }
      });
      
      // Copy config file and set permissions
      await execAsync(`sudo cp ${tempPath} ${configPath} && sudo chmod 600 ${configPath}`, {
        cwd: __dirname,
        env: { ...process.env }
      });
      
      // Clean up temp file
      fs.unlinkSync(tempPath);
    } catch (copyError) {
      // Clean up temp file even on error
      try { fs.unlinkSync(tempPath); } catch (e) {}
      throw new Error(`Failed to write config to ${configPath}: ${copyError.message}. Make sure you have sudo permissions configured.`);
    }
    
    // Bring interface up using wg-quick
    try {
      await execAsync(`sudo wg-quick up ${interfaceName}`, {
        cwd: __dirname,
        env: { ...process.env }
      });
      
      interfaceStatus[machine].isConnected = true;
      
      // Reset previous stats when interface comes up (fresh start)
      previousStats[machine] = { bytesReceived: 0, bytesSent: 0, timestamp: Date.now() };
      
      res.json({ 
        success: true, 
        message: `Interface ${interfaceName} brought up successfully`,
        machine,
        isConnected: true
      });
    } catch (error) {
      // If interface is already up, that's okay
      if (error.message.includes('already exists') || error.message.includes('Device or resource busy')) {
        interfaceStatus[machine].isConnected = true;
        return res.json({ 
          success: true, 
          message: `Interface ${interfaceName} is already up`,
          machine,
          isConnected: true
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error bringing interface up:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to bring interface up',
      details: error.stderr || error.message
    });
  }
});

// POST /api/down - Bring interface down
app.post('/api/down', async (req, res) => {
  try {
    const { machine } = req.body;
    
    if (!machine) {
      return res.status(400).json({ error: 'Machine is required' });
    }

    if (machine !== 'A' && machine !== 'B') {
      return res.status(400).json({ error: 'Machine must be A or B' });
    }

    const interfaceName = getInterfaceName(machine);
    
    try {
      await execAsync(`sudo wg-quick down ${interfaceName}`);
      interfaceStatus[machine].isConnected = false;
      
      // Reset previous stats when interface goes down
      previousStats[machine] = { bytesReceived: 0, bytesSent: 0, timestamp: Date.now() };
      
      res.json({ 
        success: true, 
        message: `Interface ${interfaceName} brought down successfully`,
        machine,
        isConnected: false
      });
    } catch (error) {
      // If interface doesn't exist, that's okay
      if (error.message.includes('No such device') || error.message.includes('does not exist')) {
        interfaceStatus[machine].isConnected = false;
        return res.json({ 
          success: true, 
          message: `Interface ${interfaceName} is already down`,
          machine,
          isConnected: false
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error bringing interface down:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to bring interface down',
      details: error.stderr || error.message
    });
  }
});

// GET /api/status/:machine - Get interface status
app.get('/api/status/:machine', async (req, res) => {
  try {
    const { machine } = req.params;
    
    if (machine !== 'A' && machine !== 'B') {
      return res.status(400).json({ error: 'Machine must be A or B' });
    }

    const interfaceName = getInterfaceName(machine);
    
    // Check actual interface status
    try {
      await execAsync(`ip link show ${interfaceName}`);
      interfaceStatus[machine].isConnected = true;
    } catch (error) {
      interfaceStatus[machine].isConnected = false;
    }
    
    res.json({ 
      isConnected: interfaceStatus[machine].isConnected,
      machine,
      interface: interfaceName
    });
  } catch (error) {
    console.error('Error checking interface status:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to check interface status'
    });
  }
});

// GET /api/network-ip - Get the machine's network IP address
app.get('/api/network-ip', async (req, res) => {
  try {
    // Get the primary network interface IP (not localhost)
    const { stdout } = await execAsync("hostname -I | awk '{print $1}'");
    const ip = stdout.trim();
    res.json({ ip: ip || '127.0.0.1' });
  } catch (error) {
    // Fallback to localhost
    res.json({ ip: '127.0.0.1' });
  }
});

// POST /api/pqc/generate-psk - Generate a ML-KEM-768 based pre-shared key
app.post('/api/pqc/generate-psk', async (_req, res) => {
  try {
    const binaryPath = path.join(__dirname, 'pqc code', 'mlkem768_psk');

    try {
      await fs.promises.access(binaryPath, fs.constants.X_OK);
    } catch (accessError) {
      return res.status(500).json({
        error: 'ML-KEM helper binary not found or not executable',
        details: 'Run ./pqc code/build.sh (requires liboqs) and ensure the binary has execute permission.'
      });
    }

    const { stdout } = await execFileAsync(binaryPath, { cwd: path.dirname(binaryPath) });
    const hex = stdout.trim();

    if (!/^[0-9a-fA-F]+$/.test(hex)) {
      throw new Error('Generator returned unexpected output');
    }

    const buffer = Buffer.from(hex, 'hex');
    const base64 = buffer.toString('base64');

    return res.json({
      algorithm: 'ML-KEM-768',
      hex: hex.toLowerCase(),
      base64
    });
  } catch (error) {
    console.error('Error generating PQC PSK:', error);
    return res.status(500).json({
      error: 'Failed to generate ML-KEM PSK',
      details: error.message || 'Unknown error'
    });
  }
});

// POST /api/generate-keys - Generate valid WireGuard key pairs using wg commands
app.post('/api/generate-keys', async (req, res) => {
  try {
    // Generate two valid WireGuard key pairs using wg commands
    const { stdout: privKeyA } = await execAsync('wg genkey');
    const { stdout: pubKeyA } = await execAsync(`echo "${privKeyA.trim()}" | wg pubkey`);
    
    const { stdout: privKeyB } = await execAsync('wg genkey');
    const { stdout: pubKeyB } = await execAsync(`echo "${privKeyB.trim()}" | wg pubkey`);
    
    res.json({
      peerA: {
        privateKey: privKeyA.trim(),
        publicKey: pubKeyA.trim()
      },
      peerB: {
        privateKey: privKeyB.trim(),
        publicKey: pubKeyB.trim()
      }
    });
  } catch (error) {
    console.error('Error generating WireGuard keys:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate WireGuard keys. Make sure WireGuard is installed.'
    });
  }
});

// GET /api/stats/:machine - Get WireGuard interface statistics
app.get('/api/stats/:machine', async (req, res) => {
  try {
    const { machine } = req.params;
    
    if (machine !== 'A' && machine !== 'B') {
      return res.status(400).json({ error: 'Machine must be A or B' });
    }

    const interfaceName = getInterfaceName(machine);
    
    try {
      // Primary method: Get stats from /proc/net/dev (no sudo needed, more reliable)
      let bytesRx = 0, bytesTx = 0, packetsRx = 0, packetsTx = 0;
      let lastHandshake = 'Unknown';
      
      try {
        const { stdout: procOutput } = await execAsync(`cat /proc/net/dev | grep -E "(^|\\\\s)${interfaceName}:"`);
        // Format: interface: bytes_rx packets_rx errs drop ... bytes_tx packets_tx ...
        // Remove interface name and colon, then split
        const line = procOutput.trim();
        const colonIndex = line.indexOf(':');
        if (colonIndex >= 0) {
          const dataPart = line.substring(colonIndex + 1).trim();
          const parts = dataPart.split(/\s+/).filter(p => p);
          if (parts.length >= 10) {
            // After removing "interface:", indices are: 0=bytes_rx, 1=packets_rx, 8=bytes_tx, 9=packets_tx
            bytesRx = parseInt(parts[0] || '0', 10);
            packetsRx = parseInt(parts[1] || '0', 10);
            bytesTx = parseInt(parts[8] || '0', 10);
            packetsTx = parseInt(parts[9] || '0', 10);
            
            // Debug: log what we're parsing
            if (bytesRx > 0 || bytesTx > 0) {
              console.log(`[Stats ${machine}] Parsed from /proc/net/dev: RX=${bytesRx} (${packetsRx} pkts), TX=${bytesTx} (${packetsTx} pkts)`);
            }
          } else {
            console.log(`[Stats ${machine}] Not enough parts in /proc/net/dev output: ${parts.length} parts`);
          }
        } else {
          console.log(`[Stats ${machine}] No colon found in /proc/net/dev line: ${line}`);
        }
      } catch (procError) {
        console.error(`[Stats ${machine}] Error reading /proc/net/dev:`, procError.message);
      }
      
      // Try to get handshake info from wg show (optional, needs sudo)
      try {
        const { stdout: wgOutput } = await execAsync(`sudo wg show ${interfaceName} dump 2>/dev/null || echo ""`);
        const lines = wgOutput.trim().split('\n').filter(line => line.trim());
        if (lines.length > 1) {
          // Parse handshake from peer line
          for (let i = 1; i < lines.length; i++) {
            const peerLine = lines[i].split('\t');
            if (peerLine.length >= 5) {
              const handshake = parseInt(peerLine[4] || '0', 10);
              if (handshake > 0) {
                const secondsAgo = Math.floor(Date.now() / 1000) - handshake;
                if (secondsAgo < 60) {
                  lastHandshake = `${secondsAgo}s ago`;
                } else if (secondsAgo < 3600) {
                  lastHandshake = `${Math.floor(secondsAgo / 60)}m ago`;
                } else {
                  lastHandshake = `${Math.floor(secondsAgo / 3600)}h ago`;
                }
                break;
              }
            }
          }
        }
      } catch (wgError) {
        // wg show failed (probably sudo issue), that's okay, we have /proc/net/dev data
      }

      // Calculate actual transfer rate using previous values
      const now = Date.now();
      const prev = previousStats[machine];
      const timeDiff = (now - prev.timestamp) / 1000; // seconds
      
      let transferRate = 0;
      // Only calculate rate if we have valid previous data and enough time has passed
      if (timeDiff > 0.5 && prev.timestamp > 0) {
        // Calculate bytes per second (total of both directions)
        const totalBytesNow = bytesRx + bytesTx;
        const totalBytesPrev = prev.bytesReceived + prev.bytesSent;
        const bytesDiff = totalBytesNow - totalBytesPrev;
        transferRate = Math.max(0, bytesDiff / timeDiff);
        
        // Debug logging for rate calculation
        if (transferRate > 0 || bytesDiff !== 0) {
          console.log(`[Stats ${machine}] Rate calc: prevBytes=${totalBytesPrev}, nowBytes=${totalBytesNow}, diff=${bytesDiff}, timeDiff=${timeDiff.toFixed(2)}s, rate=${transferRate.toFixed(2)} B/s`);
        }
      } else {
        // Debug why rate wasn't calculated
        if (prev.timestamp === 0) {
          console.log(`[Stats ${machine}] First reading - initializing stats (timestamp was 0)`);
        } else if (timeDiff <= 0.5) {
          console.log(`[Stats ${machine}] Time diff too small: ${timeDiff.toFixed(3)}s`);
        }
      }
      // If this is the first reading (prev timestamp is 0), rate stays 0
      
      // Always update previous stats for next calculation
      // This ensures we can calculate rate on subsequent calls
      previousStats[machine] = {
        bytesReceived: bytesRx,
        bytesSent: bytesTx,
        timestamp: now
      };
      
      // Debug logging - log every call to help diagnose
      console.log(`[Stats ${machine}] Interface: ${interfaceName}, RX: ${bytesRx}, TX: ${bytesTx}, Rate: ${transferRate.toFixed(2)} B/s, Packets RX: ${packetsRx}, TX: ${packetsTx}, TimeDiff: ${timeDiff.toFixed(2)}s`);

      res.json({
        bytesReceived: bytesRx,
        bytesSent: bytesTx,
        packetsReceived: packetsRx,
        packetsSent: packetsTx,
        lastHandshake: lastHandshake,
        transferRate,
      });
    } catch (error) {
      // Interface doesn't exist or not connected
      if (error.message.includes('No such device')) {
        return res.json({
          bytesReceived: 0,
          bytesSent: 0,
          packetsReceived: 0,
          packetsSent: 0,
          lastHandshake: 'Never',
          transferRate: 0,
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error getting network stats:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get network statistics'
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
