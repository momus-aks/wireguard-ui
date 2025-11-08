# Connecting Two Linux Machines via LAN

This guide explains how to connect two Linux machines on the same LAN using this WireGuard app.

## Prerequisites

Both machines need:
- Node.js installed
- WireGuard installed: `sudo apt install wireguard` (or equivalent)
- Sudo permissions configured (see `SUDO_SETUP.md`)
- The app files (or clone the repo)

## Step 1: Find IP Addresses

### On Machine A:
```bash
hostname -I | awk '{print $1}'
# Or
ip addr show | grep "inet " | grep -v 127.0.0.1
```
Note down the IP (e.g., `192.168.1.100`)

### On Machine B:
```bash
hostname -I | awk '{print $1}'
```
Note down the IP (e.g., `192.168.1.101`)

## Step 2: Set Up the App on Both Machines

### Option A: Full Setup (Recommended)
1. Copy the entire project folder to both machines
2. On each machine:
   ```bash
   cd wireguard-connect-simulator
   npm install
   ```

### Option B: Backend Only
1. Copy `server.cjs` and `package.json` to both machines
2. On each machine:
   ```bash
   npm install express cors
   ```

## Step 3: Start the App

### On Machine A:
```bash
npm start
# Or if backend only:
node server.cjs
```
The app will be accessible at: `http://192.168.1.100:3000`

### On Machine B:
```bash
npm start
# Or if backend only:
node server.cjs
```
The app will be accessible at: `http://192.168.1.101:3000`

## Step 4: Generate Configs

### On Machine A (or B - you only need to do this once):

1. Open the webapp in a browser: `http://192.168.1.100:3000` (or Machine B's IP)

2. **Uncheck** "Use localhost (single machine)"

3. **Enter the IP addresses:**
   - **Machine A IP**: `192.168.1.100` (Machine A's IP)
   - **Machine B IP**: `192.168.1.101` (Machine B's IP)

4. Click **"Generate New Peer Configs"**

5. You'll see two configs:
   - **configA** - Use this on Machine A
   - **configB** - Use this on Machine B

## Step 5: Apply Configs

### On Machine A:
1. Copy the **configA** from the webapp
2. In the webapp on Machine A, click **"Connect"** for Machine A
   - OR manually: The config is already applied when you click Connect

### On Machine B:
1. Open the webapp: `http://192.168.1.101:3000`
2. Copy the **configB** from the webapp (or from Machine A)
3. Click **"Connect"** for Machine B

## Step 6: Verify Connection

### Check on Machine A:
```bash
sudo wg show
# Should show wg0 interface with peer connection
```

### Check on Machine B:
```bash
sudo wg show
# Should show wg1 interface with peer connection
```

### Test connectivity:
```bash
# On Machine A, ping Machine B's WireGuard IP:
ping 10.0.8.2

# On Machine B, ping Machine A's WireGuard IP:
ping 10.0.8.1
```

## Alternative: Single Webapp Setup

If you want to use just one webapp to control both:

1. **Run the app on Machine A only**
2. **On Machine B**, just run the backend:
   ```bash
   node server.cjs
   ```
3. **Access the webapp from Machine B's browser** at `http://192.168.1.100:3000`
4. The frontend will connect to Machine B's local backend (localhost:3001)
5. Generate configs with both IPs and connect from the webapp

## Troubleshooting

### Can't access webapp from other machine:
- Check firewall: `sudo ufw allow 3000` and `sudo ufw allow 3001`
- Verify both machines are on same network
- Try accessing via IP instead of hostname

### WireGuard not connecting:
- Check that both machines have WireGuard installed
- Verify configs have correct IPs (not localhost)
- Check firewall allows UDP ports 51820 and 51821
- Run `sudo wg show` to see connection status

### Sudo password prompts:
- Set up passwordless sudo (see `SUDO_SETUP.md`)
- Or run backend with: `sudo node server.cjs`

## Network Diagram

```
Machine A (192.168.1.100)          Machine B (192.168.1.101)
├─ WireGuard wg0                    ├─ WireGuard wg1
│  └─ IP: 10.0.8.1/24              │  └─ IP: 10.0.8.2/24
│                                   │
├─ Webapp:3000                      ├─ Webapp:3000 (optional)
└─ Backend:3001                     └─ Backend:3001
     │                                    │
     └────────── LAN Connection ─────────┘
          (192.168.1.0/24)
```

## Quick Reference

**Machine A:**
- LAN IP: `192.168.1.100`
- WireGuard IP: `10.0.8.1/24`
- WireGuard Port: `51820`
- Endpoint points to: `192.168.1.101:51821`

**Machine B:**
- LAN IP: `192.168.1.101`
- WireGuard IP: `10.0.8.2/24`
- WireGuard Port: `51821`
- Endpoint points to: `192.168.1.100:51820`

