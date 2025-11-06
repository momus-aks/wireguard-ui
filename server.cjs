const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
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
  A: { bytesReceived: 0, bytesSent: 0, timestamp: Date.now() },
  B: { bytesReceived: 0, bytesSent: 0, timestamp: Date.now() }
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
    const fs = require('fs');
    const path = require('path');
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

// GET /api/stats/:machine - Get WireGuard interface statistics
app.get('/api/stats/:machine', async (req, res) => {
  try {
    const { machine } = req.params;
    
    if (machine !== 'A' && machine !== 'B') {
      return res.status(400).json({ error: 'Machine must be A or B' });
    }

    const interfaceName = getInterfaceName(machine);
    
    try {
      // Get WireGuard statistics using wg show
      const { stdout } = await execAsync(`sudo wg show ${interfaceName} dump`);
      const lines = stdout.trim().split('\n');
      
      if (lines.length < 2) {
        // No peer connected
        return res.json({
          bytesReceived: 0,
          bytesSent: 0,
          packetsReceived: 0,
          packetsSent: 0,
          lastHandshake: 'Never',
          transferRate: 0,
        });
      }

      // Parse wg dump output
      // Format: public_key, preshared_key, endpoint, allowed_ips, latest_handshake, transfer_rx, transfer_tx, persistent_keepalive
      const peerLine = lines[1].split('\t');
      const transferRx = parseInt(peerLine[5] || '0', 10);
      const transferTx = parseInt(peerLine[6] || '0', 10);
      const lastHandshake = parseInt(peerLine[4] || '0', 10);
      
      // Get packet counts from /proc/net/dev or use estimated values
      let packetsReceived = 0;
      let packetsSent = 0;
      try {
        const { stdout: procOutput } = await execAsync(`cat /proc/net/dev | grep ${interfaceName}`);
        const parts = procOutput.trim().split(/\s+/);
        if (parts.length >= 10) {
          packetsReceived = parseInt(parts[2] || '0', 10);
          packetsSent = parseInt(parts[10] || '0', 10);
        }
      } catch (e) {
        // Estimate packets (rough approximation: 1 packet ≈ 1500 bytes)
        packetsReceived = Math.floor(transferRx / 1500);
        packetsSent = Math.floor(transferTx / 1500);
      }

      // Calculate time since last handshake
      let handshakeTime = 'Never';
      if (lastHandshake > 0) {
        const secondsAgo = Math.floor(Date.now() / 1000) - lastHandshake;
        if (secondsAgo < 60) {
          handshakeTime = `${secondsAgo}s ago`;
        } else if (secondsAgo < 3600) {
          handshakeTime = `${Math.floor(secondsAgo / 60)}m ago`;
        } else {
          handshakeTime = `${Math.floor(secondsAgo / 3600)}h ago`;
        }
      }

      // Calculate actual transfer rate using previous values
      const now = Date.now();
      const prev = previousStats[machine];
      const timeDiff = (now - prev.timestamp) / 1000; // seconds
      
      let transferRate = 0;
      if (timeDiff > 0 && prev.timestamp > 0) {
        // Calculate bytes per second
        const bytesDiff = (transferRx + transferTx) - (prev.bytesReceived + prev.bytesSent);
        transferRate = Math.max(0, bytesDiff / timeDiff);
      }
      
      // Update previous stats for next calculation
      previousStats[machine] = {
        bytesReceived: transferRx,
        bytesSent: transferTx,
        timestamp: now
      };

      res.json({
        bytesReceived: transferRx,
        bytesSent: transferTx,
        packetsReceived,
        packetsSent,
        lastHandshake: handshakeTime,
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
