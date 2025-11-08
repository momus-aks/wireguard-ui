# WireGuard Connect Simulator

A web-based application to generate WireGuard peer configurations and control local WireGuard interfaces. Perfect for testing WireGuard connections between two machines on a LAN or simulating connections on a single machine.

![WireGuard Controller](https://img.shields.io/badge/WireGuard-Controller-blue)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- 🔐 **Local Config Generation**: Generate WireGuard peer configurations without external APIs
- 🌐 **Network Topology Visualization**: Visual network graph showing connection status
- 📊 **Real-time Network Monitoring**: Live statistics with transfer rate graphs
- 🖥️ **Multi-machine Support**: Connect two Linux machines via LAN
- 🧪 **Single Machine Testing**: Test with localhost or network IP on same machine
- 🎨 **Modern UI**: Beautiful, responsive dashboard with real-time updates
- 📈 **Network Statistics**: Track bytes sent/received, packets, and handshake times

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Sudo Configuration](#sudo-configuration)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Features Guide](#features-guide)
- [Network Setup](#network-setup)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

## Prerequisites

### Required Software

- **Node.js** (v18 or higher)
- **WireGuard** installed on your system
- **Sudo** access with passwordless configuration (see below)

### Install WireGuard

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install wireguard wireguard-tools
```

**Fedora/RHEL:**
```bash
sudo dnf install wireguard-tools
```

**Arch Linux:**
```bash
sudo pacman -S wireguard-tools
```

### Verify Installation

```bash
wg --version
# Should output WireGuard version
```

## Installation

### 1. Clone or Download the Project

```bash
git clone <repository-url>
cd wireguard-connect-simulator
```

Or download and extract the project files.

### 2. Install Dependencies

```bash
npm install
```

This will install:
- Express (backend server)
- React & Vite (frontend)
- CORS (for cross-origin requests)
- Other required dependencies

### 3. Verify Installation

```bash
npm start
```

You should see:
```
Server running on http://localhost:3001
VITE ready in XXX ms
➜  Local:   http://localhost:3000/
```

## Sudo Configuration

The backend needs sudo permissions to control WireGuard interfaces. You have two options:

### Option 1: Automated Setup (Recommended)

Run the provided setup script:

```bash
./setup-sudo.sh
```

This script will:
- Create a sudoers file for your user
- Configure passwordless sudo for WireGuard commands
- Test the configuration

### Option 2: Manual Setup

#### Step 1: Open Sudoers Editor

```bash
sudo visudo -f /etc/sudoers.d/wireguard-$(whoami)
```

Replace `$(whoami)` with your username, or use:
```bash
sudo visudo -f /etc/sudoers.d/wireguard-YOUR_USERNAME
```

#### Step 2: Add These Lines

Replace `YOUR_USERNAME` with your actual username:

```
YOUR_USERNAME ALL=(ALL) NOPASSWD: /usr/bin/wg-quick *
YOUR_USERNAME ALL=(ALL) NOPASSWD: /bin/mkdir -p /etc/wireguard
YOUR_USERNAME ALL=(ALL) NOPASSWD: /bin/chmod 755 /etc/wireguard
YOUR_USERNAME ALL=(ALL) NOPASSWD: /bin/chmod 600 /etc/wireguard/*
YOUR_USERNAME ALL=(ALL) NOPASSWD: /bin/cp /home/YOUR_USERNAME/path/to/project/wg*.conf.tmp /etc/wireguard/*
YOUR_USERNAME ALL=(ALL) NOPASSWD: /usr/bin/ip link show wg*
```

**Important:** Replace `/home/YOUR_USERNAME/path/to/project/` with your actual project path!

#### Step 3: Save and Exit

- Press `Ctrl+X`
- Press `Y` to confirm
- Press `Enter` to save

#### Step 4: Set Permissions

```bash
sudo chmod 0440 /etc/sudoers.d/wireguard-$(whoami)
```

#### Step 5: Test Configuration

```bash
# These should NOT prompt for password:
sudo -n mkdir -p /etc/wireguard
sudo -n wg-quick --version
```

If you see "password required" errors:
- Log out and log back in
- Or restart your terminal session
- Verify the sudoers file syntax: `sudo visudo -c`

### Troubleshooting Sudo Setup

**"visudo: command not found"**
```bash
sudo apt install sudo  # or equivalent for your distro
```

**"user is not in the sudoers file"**
```bash
sudo usermod -aG sudo $USER
# Log out and log back in
```

**Still asking for password?**
- Check file syntax: `sudo visudo -c -f /etc/sudoers.d/wireguard-$(whoami)`
- Verify paths match your actual installation
- Make sure you logged out and back in after changes

## Quick Start

### Single Machine (Localhost)

1. **Start the application:**
   ```bash
   npm start
   ```

2. **Open in browser:**
   ```
   http://localhost:3000
   ```

3. **Generate configs:**
   - Keep "Use localhost (single machine)" checked
   - Click "Generate New Peer Configs"

4. **Connect:**
   - Click "Connect" for Machine A
   - Click "Connect" for Machine B

5. **Verify:**
   ```bash
   sudo wg show
   ```

### Two Machines on LAN

See [Network Setup](#network-setup) section below.

## Usage

### Starting the Application

```bash
npm start
```

This starts both:
- **Frontend**: Vite dev server on port 3000
- **Backend**: Express server on port 3001

### Accessing the Web Interface

- **Local**: `http://localhost:3000`
- **Network**: `http://YOUR_IP:3000` (accessible from other machines)

### Generating Configurations

1. **Choose connection type:**
   - ✅ **Use localhost**: For single machine testing
   - ✅ **Test with network IP**: Simulate remote connection on same machine
   - ❌ **Uncheck both**: Enter IPs manually for two separate machines

2. **Enter IP addresses** (if not using localhost):
   - Machine A IP: Your first machine's LAN IP
   - Machine B IP: Your second machine's LAN IP

3. **Click "Generate New Peer Configs"**

4. **Configs are automatically displayed** in the machine panels

### Connecting Interfaces

- Click **"Connect"** button on each machine panel
- The interface will be brought up using `wg-quick`
- Status indicators will show connection progress

### Monitoring

Once connected, you'll see:
- **Network Graph**: Visual topology of the connection
- **Network Monitors**: Real-time statistics for each machine
- **Connection Stats**: Data transfer information

### Generating a Post-Quantum PSK

1. Install the [Open Quantum Safe](https://github.com/open-quantum-safe/liboqs) library so that `pkg-config --libs liboqs` succeeds.
2. Build the helper binary (one time):
   ```bash
   ./pqc\ code/build.sh
   ```
3. In the dashboard, open **Post-Quantum PSK (ML-KEM-768)** and click **Generate ML-KEM PSK**.
4. Copy the Base64 or Hex value and insert it into the WireGuard `PresharedKey` field.

> The helper performs an ML-KEM-768 encapsulation/decapsulation round and outputs a 32-byte shared secret.

> **Vagrant users:** the provisioning script now installs `liboqs` and `libsodium` and builds the helper automatically. Run `vagrant reload --provision` once to pick up the change.

> **Bare metal:** install `libsodium-dev` plus `liboqs` (build from source following the helper script) before running `./pqc\ code/build.sh`.

### One-Click Sync & Connect

Once both machines are running their backends:

1. Enter Machine A IP, Machine B IP, and confirm the **Peer API URL** points at `http://MACHINE_B_IP:3001/api`.
2. Generate configurations (and optionally adjust the PSK card).
3. Click **Push Configs & Connect Both Machines**.

The app will:
- Generate a fresh ML-KEM preshared key (if not already present).
- Inject it into both configs.
- Push the Machine B config to the remote backend and bring `wg1` up.
- Bring Machine A’s `wg0` up locally.
- Update the dashboard with the new status and PSK.

## Full End-to-End Workflow

Follow these steps for a complete session between Machine A (`192.168.56.10`) and Machine B (`192.168.56.11`).

### 1. Clean Slate (Both Machines)
```bash
sudo wg-quick down wg0 2>/dev/null || true
sudo wg-quick down wg1 2>/dev/null || true
sudo ip route del blackhole 10.0.8.0/24 2>/dev/null || true
```

### 2. Start the Apps
```bash
cd ~/wireguard-connect-simulator
pm2 stop all && pm2 delete all  # optional if you have old processes
pm2 start npm --name backend -- run start-backend
pm2 start npm --name frontend -- run start-frontend -- --host 0.0.0.0
```
Repeat on Machine B.

### 3. Pairing in the Dashboard
1. Load Machine A UI: `http://192.168.56.10:3000`
2. Set **Machine B IP** = `192.168.56.11`
3. Set **Peer API URL** = `http://192.168.56.11:3001/api`
4. Optionally click “Check peer” (if enabled) to confirm the backend is reachable.

### 4. Generate WireGuard Configs
- Click **Generate Configurations**.
- If the backend can’t return real keys, a red warning will appear; connections will fall back to placeholder keys, so address any “placeholder” warning before proceeding.

### 5. Generate and Apply PQC PSK
- Click **Generate ML-KEM PSK**.
- Click **Apply PSK to both configs** to automatically insert the preshared key into Machine A & B configs.

### 6. Push Configs & Activate Tunnel
- Click **Push Configs & Connect Both Machines**.
  - The app will:
    1. Attempt to bring down any existing `wg0/wg1` interfaces (errors are ignored if they weren’t present).
    2. Upload Machine B’s config via its backend.
    3. Apply Machine A’s config locally.
    4. Bring interfaces up on both sides.
    5. Poll `/status` and `/stats` until both peers report “connected”.
- Once active, the monitor cards show live Mbps, peak rates, and handshake timestamps.

### 7. Verification
- From Machine A:
  ```bash
  sudo wg show
  ping -I wg0 10.0.8.2
  ```
- From Machine B:
  ```bash
  sudo wg show
  ping -I wg1 10.0.8.1
  ```
- You can also run `iperf3` through the tunnel to see the graph respond.

### 8. Tear Down / Reset
- Click **Disconnect** in the dashboard, or run:
  ```bash
  sudo wg-quick down wg0  # Machine A
  sudo wg-quick down wg1  # Machine B
  sudo ip route del blackhole 10.0.8.0/24 2>/dev/null || true  # remove safety route if you added it
  ```
- To start over, repeat from Step 3. Every new run can generate fresh configs and PSKs.

### Notes
- The “wg-quick … not a WireGuard interface” logs in the console are expected when the app tries to bring down an interface that isn’t up yet; they are handled automatically.
- Source-map warnings in the browser console are from Vite’s dev server; they do not affect functionality.
- Always ensure the peer has the backend running and accessible through the Peer API URL to avoid falling back to placeholder keys.


## Features Guide

### 1. Network Topology Graph

- **Visual representation** of the connection between machines
- **Color-coded status**: Green = connected, Gray = disconnected
- **Shows IP addresses**: Both WireGuard IPs (10.0.8.x) and machine IPs
- **Interface details**: Displays wg0/wg1 and port numbers

### 2. Network Monitoring

**Real-time Statistics:**
- **Transfer Rate Graph**: Bar chart showing data flow over time
- **Bytes Received/Sent**: Total data transferred
- **Packet Counts**: Number of packets transmitted
- **Last Handshake**: Time since last WireGuard handshake

**Updates every 2 seconds** when connection is active.

### 3. Connection Modes

**Localhost Mode:**
- Both peers connect via 127.0.0.1
- Perfect for testing on single machine
- Uses ports 51820 and 51821

**Network IP Mode:**
- Uses your machine's network IP
- Simulates remote connection scenario
- Still works on same machine (machine can reach itself)

**Remote Mode:**
- Enter two different machine IPs
- For connecting machines on LAN
- Each machine needs its own backend running

### 4. Interface Management

- **Automatic config file creation** in `/etc/wireguard/`
- **Proper file permissions** (600 for configs, 755 for directory)
- **Status polling** every 5 seconds
- **Error handling** with user-friendly messages

## Network Setup

### Connecting Two Linux Machines

#### Step 1: Find IP Addresses

**On Machine A:**
```bash
hostname -I | awk '{print $1}'
# Example output: 192.168.1.100
```

**On Machine B:**
```bash
hostname -I | awk '{print $1}'
# Example output: 192.168.1.101
```

#### Step 2: Set Up on Both Machines

**Option A: Full Setup (Recommended)**
```bash
# Copy project to both machines
# On each machine:
cd wireguard-connect-simulator
npm install
npm start
```

**Option B: Backend Only**
```bash
# Copy server.cjs and package.json to both machines
# On each machine:
npm install express cors
node server.cjs
```

#### Step 3: Configure Firewall

**On both machines:**
```bash
sudo ufw allow 3000/tcp  # Web interface
sudo ufw allow 3001/tcp  # Backend API
sudo ufw allow 51820/udp # WireGuard Machine A
sudo ufw allow 51821/udp # WireGuard Machine B
```

#### Step 4: Generate Configs

1. Open webapp on Machine A: `http://192.168.1.100:3000`
2. **Uncheck** "Use localhost"
3. Enter:
   - Machine A IP: `192.168.1.100`
   - Machine B IP: `192.168.1.101`
4. Click "Generate New Peer Configs"

#### Step 5: Connect

**On Machine A:**
- Click "Connect" for Machine A (uses configA)

**On Machine B:**
- Open webapp: `http://192.168.1.101:3000`
- Click "Connect" for Machine B (uses configB)

#### Step 6: Verify Connection

```bash
# On Machine A:
sudo wg show
ping 10.0.8.2  # Should work

# On Machine B:
sudo wg show
ping 10.0.8.1  # Should work
```

### Single Webapp Setup (Alternative)

You can run the full app on one machine and just the backend on the other:

1. **Machine A**: Run `npm start` (full app)
2. **Machine B**: Run `node server.cjs` (backend only)
3. **Access from Machine B**: Open `http://192.168.1.100:3000` in browser
4. Frontend will connect to Machine B's local backend automatically

## Troubleshooting

### Backend Not Starting

**Port already in use:**
```bash
# Find process using port 3001
lsof -i :3001
# Kill the process or use different port
```

**Permission denied:**
- Check sudo configuration (see [Sudo Configuration](#sudo-configuration))
- Verify WireGuard is installed

### CORS Errors

**"Cross-Origin Request Blocked"**
- Make sure backend is running on port 3001
- Check CORS configuration in `server.cjs`
- Verify firewall allows port 3001

### WireGuard Not Connecting

**"No such device" error:**
- Verify WireGuard is installed: `wg --version`
- Check config file exists: `sudo ls -la /etc/wireguard/`
- Verify config syntax: `sudo wg-quick up wg0 --dry-run`

**Connection timeout:**
- Check firewall rules (ports 51820, 51821)
- Verify both machines are on same network
- Test connectivity: `ping MACHINE_B_IP`

**Sudo password prompts:**
- Re-run sudo setup (see [Sudo Configuration](#sudo-configuration))
- Log out and back in after sudoers changes

### Network Stats Not Showing

**Stats endpoint returns 404:**
- Restart the backend server
- Verify endpoint exists: `curl http://localhost:3001/api/stats/A`

**Stats showing zeros:**
- Check WireGuard interface is up: `sudo wg show`
- Verify peer is connected
- Check backend logs for errors

### Frontend Not Loading

**"Cannot GET /"**
- Make sure Vite is running (check npm start output)
- Verify port 3000 is not in use
- Check browser console for errors

**Styles not loading:**
- Verify `index.css` exists
- Clear browser cache
- Check Vite dev server is running

## API Reference

### Backend Endpoints

All endpoints are prefixed with `/api`

#### `POST /api/up`
Bring WireGuard interface up.

**Request:**
```json
{
  "machine": "A" | "B",
  "config": "WireGuard config string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Interface wg0 brought up successfully",
  "machine": "A",
  "isConnected": true
}
```

#### `POST /api/down`
Bring WireGuard interface down.

**Request:**
```json
{
  "machine": "A" | "B"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Interface wg0 brought down successfully",
  "machine": "A",
  "isConnected": false
}
```

#### `GET /api/status/:machine`
Get interface connection status.

**Response:**
```json
{
  "isConnected": true,
  "machine": "A",
  "interface": "wg0"
}
```

#### `GET /api/stats/:machine`
Get WireGuard interface statistics.

**Response:**
```json
{
  "bytesReceived": 1234567,
  "bytesSent": 987654,
  "packetsReceived": 1234,
  "packetsSent": 567,
  "lastHandshake": "5s ago",
  "transferRate": 1234.56
}
```

#### `GET /api/network-ip`
Get machine's network IP address.

**Response:**
```json
{
  "ip": "192.168.1.100"
}
```

## Project Structure

```
wireguard-connect-simulator/
├── server.cjs              # Backend Express server
├── package.json            # Dependencies and scripts
├── vite.config.mjs         # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── index.html              # HTML entry point
├── index.tsx               # React entry point
├── App.tsx                 # Main application component
├── apiService.ts           # API client functions
├── services/
│   └── geminiService.ts    # Config generation (local)
├── components/
│   ├── ActionButton.tsx
│   ├── ConfigDisplay.tsx
│   ├── ConnectionStats.tsx
│   ├── MachinePanel.tsx
│   ├── NetworkGraph.tsx    # Network topology visualization
│   ├── NetworkMonitor.tsx  # Real-time statistics
│   └── StatusDisplay.tsx
├── types.ts                # TypeScript type definitions
├── setup-sudo.sh           # Automated sudo configuration
├── BACKEND_SETUP.md        # Backend-only setup guide
├── SUDO_SETUP.md           # Detailed sudo configuration
├── LAN_SETUP_GUIDE.md      # Two-machine setup guide
└── README.md              # This file
```

## Development

### Running in Development Mode

```bash
npm start
```

Starts both frontend and backend with hot reload.

### Building for Production

```bash
npm run build
```

Builds the frontend to `dist/` directory.

### Backend Only

```bash
node server.cjs
```

Runs just the backend server.

## Security Notes

- ⚠️ **Sudo Configuration**: The app requires sudo access. Only run on trusted systems.
- ⚠️ **Network Access**: The app listens on `0.0.0.0` by default. Use firewall rules in production.
- ⚠️ **Config Files**: WireGuard configs contain private keys. Keep them secure.
- ✅ **Local Generation**: No external APIs used for config generation.
- ✅ **CORS**: Configured to allow network access while maintaining security.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review the setup guides in the `docs/` directory
3. Open an issue on the repository

## Acknowledgments

- Built with React, Vite, and Express
- Uses WireGuard for VPN functionality
- UI components with Tailwind CSS
- Icons from Lucide React

---

**Happy Networking! 🔐🌐**
