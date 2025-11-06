# Features Documentation

Complete guide to all features of the WireGuard Connect Simulator.

## Table of Contents

- [Core Features](#core-features)
- [Network Visualization](#network-visualization)
- [Network Monitoring](#network-monitoring)
- [Configuration Management](#configuration-management)
- [Connection Modes](#connection-modes)
- [API Features](#api-features)

## Core Features

### 1. Local Config Generation

**What it does:**
- Generates WireGuard peer configurations locally without external APIs
- Creates matching key pairs for both peers
- Assigns IPs from 10.0.8.0/24 range
- Configures proper endpoints and ports

**How to use:**
1. Click "Generate New Peer Configs" button
2. Configs appear in Machine A and Machine B panels
3. Configs are ready to use immediately

**Technical details:**
- Uses Web Crypto API for key generation
- Generates 32-byte keys, base64 encoded
- Creates proper WireGuard config format
- No external dependencies required

### 2. Interface Management

**What it does:**
- Brings WireGuard interfaces up/down
- Manages config files in `/etc/wireguard/`
- Handles file permissions automatically
- Provides real-time status updates

**How to use:**
- Click "Connect" to bring interface up
- Click "Disconnect" to bring interface down
- Status updates automatically every 5 seconds

**Technical details:**
- Uses `wg-quick` for interface management
- Creates config files with 600 permissions
- Handles errors gracefully
- Supports wg0 and wg1 interfaces

## Network Visualization

### Network Topology Graph

**What it shows:**
- Visual representation of both machines
- Connection status (connected/disconnected)
- WireGuard IP addresses (10.0.8.x)
- Machine network IPs (if configured)
- Interface names (wg0, wg1)
- Port numbers (51820, 51821)

**Visual indicators:**
- 🟢 Green border = Connected
- ⚪ Gray border = Disconnected
- Pulsing dot = Active connection
- Animated line = Data flowing

**When it appears:**
- Shows when at least one machine is connected
- Updates in real-time as status changes

### Connection Stats

**What it shows:**
- Link status (Established/Down)
- Data sent from A to B
- Data sent from B to A
- Visual status indicator

**Updates:**
- Real-time data transfer simulation
- Resets when connection drops

## Network Monitoring

### Real-time Statistics

**For each machine (A and B):**

#### Transfer Rate Graph
- Bar chart showing data flow over time
- Updates every 2 seconds
- Shows last 30 data points
- Auto-scales to maximum rate

#### Statistics Cards

**Bytes Received:**
- Total data received by this machine
- Includes packet count
- Updates in real-time

**Bytes Sent:**
- Total data sent from this machine
- Includes packet count
- Updates in real-time

**Total Transfer:**
- Combined received + sent
- Total packet count
- Overall usage metric

**Last Handshake:**
- Time since last WireGuard handshake
- Formatted as "Xs ago", "Xm ago", or "Xh ago"
- Critical for connection health

### Data Sources

**Real Data (when available):**
- Fetches from WireGuard via `wg show`
- Reads from `/proc/net/dev` for packet counts
- Calculates actual transfer rates
- Gets handshake timestamps

**Fallback Data:**
- Simulated data if backend unavailable
- Useful for testing UI
- Still shows realistic patterns

## Configuration Management

### Config Display

**Features:**
- Shows full WireGuard configuration
- Copy to clipboard button
- Syntax highlighting (monospace font)
- Scrollable for long configs
- Shows WireGuard IP address

**Config Format:**
```
[Interface]
PrivateKey = <base64-key>
Address = 10.0.8.1/24
ListenPort = 51820

[Peer]
PublicKey = <base64-key>
Endpoint = 127.0.0.1:51821
AllowedIPs = 10.0.8.0/24
```

### Automatic File Management

**What happens automatically:**
- Configs written to `/etc/wireguard/`
- Directory created if missing
- Proper permissions set (600 for files, 755 for dir)
- Temp files cleaned up
- Error handling for all operations

## Connection Modes

### 1. Localhost Mode

**Use case:** Testing on single machine

**Configuration:**
- Check "Use localhost (single machine)"
- Both endpoints use 127.0.0.1
- Ports: 51820 (A) and 51821 (B)

**How it works:**
- Machine A connects to 127.0.0.1:51821
- Machine B connects to 127.0.0.1:51820
- Both interfaces on same machine
- Perfect for development/testing

### 2. Network IP Test Mode

**Use case:** Simulate remote connection on same machine

**Configuration:**
- Check "Test with network IP"
- Auto-detects your machine's network IP
- Uses that IP for both endpoints

**How it works:**
- Machine can reach itself via network IP
- Simulates real remote connection
- Tests network IP configuration
- No second machine needed

**Example:**
- Your machine IP: 192.168.1.100
- Config A endpoint: 192.168.1.100:51821
- Config B endpoint: 192.168.1.100:51820

### 3. Remote Mode (Two Machines)

**Use case:** Connect two separate machines on LAN

**Configuration:**
- Uncheck "Use localhost"
- Enter Machine A IP: e.g., 192.168.1.100
- Enter Machine B IP: e.g., 192.168.1.101

**How it works:**
- Machine A connects to Machine B's IP
- Machine B connects to Machine A's IP
- Each machine runs its own backend
- Real peer-to-peer connection

**Setup requirements:**
- Both machines on same network
- Firewall allows ports 51820, 51821
- Each machine has WireGuard installed
- Backend running on both machines

## API Features

### RESTful Endpoints

All endpoints return JSON and support CORS.

#### Interface Control

**POST /api/up**
- Brings interface up
- Creates config file
- Starts WireGuard interface
- Returns success/error status

**POST /api/down**
- Brings interface down
- Stops WireGuard interface
- Returns success/error status

#### Status & Monitoring

**GET /api/status/:machine**
- Returns connection status
- Checks interface existence
- Updates internal state

**GET /api/stats/:machine**
- Returns detailed statistics
- Bytes sent/received
- Packet counts
- Handshake time
- Transfer rate

**GET /api/network-ip**
- Returns machine's network IP
- Auto-detects primary interface
- Used for test mode

### Error Handling

**Graceful degradation:**
- Handles missing interfaces
- Provides helpful error messages
- Falls back to simulated data when needed
- Logs errors for debugging

**User feedback:**
- Error messages in UI
- Status indicators show problems
- Console logging for developers

## Advanced Features

### Automatic Status Polling

**What it does:**
- Checks interface status every 5 seconds
- Updates UI automatically
- Detects connection changes
- Handles backend disconnections

**Benefits:**
- Always shows current state
- No manual refresh needed
- Detects external changes

### Network Access

**Frontend:**
- Accessible from network (0.0.0.0:3000)
- CORS configured for cross-origin
- Works from any machine on LAN

**Backend:**
- Listens on all interfaces (0.0.0.0:3001)
- CORS allows all origins
- Secure by design (local operations only)

### Responsive Design

**Mobile support:**
- Works on tablets and phones
- Responsive grid layouts
- Touch-friendly buttons
- Readable on small screens

**Desktop optimized:**
- Multi-column layouts
- Hover effects
- Keyboard navigation
- Large screen utilization

## Performance

### Optimization Features

**Frontend:**
- React with efficient re-renders
- Debounced API calls
- Optimized state management
- Lazy loading where possible

**Backend:**
- Async operations
- Efficient file I/O
- Minimal resource usage
- Fast response times

### Resource Usage

**Typical usage:**
- Frontend: ~50MB RAM
- Backend: ~30MB RAM
- CPU: Minimal (<1% idle)
- Network: Only when polling

## Security Features

### Config Security

- Config files with 600 permissions
- Private keys never exposed in logs
- Secure file handling
- Temp file cleanup

### Network Security

- CORS properly configured
- No sensitive data in URLs
- Local operations only
- Firewall-friendly

### Sudo Security

- Minimal sudo permissions
- Specific command whitelist
- No shell access
- Audit trail via sudoers

## Future Enhancements

Potential features for future versions:

- [ ] Multiple peer support (more than 2)
- [ ] Config import/export
- [ ] Historical statistics
- [ ] Connection quality metrics
- [ ] Automated testing
- [ ] Docker support
- [ ] WebSocket for real-time updates
- [ ] Dark/light theme toggle
- [ ] Export statistics to CSV
- [ ] Connection presets/profiles

---

For setup instructions, see [README.md](README.md)

