# Backend Setup for Peer Machines

To run the backend on another machine, you need these files:

## Required Files

1. **`server.cjs`** - The backend server file
2. **`package.json`** - Dependencies configuration (or use the minimal one below)

## Quick Setup

### Option 1: Full Setup (Recommended)
Send these files to the peer:
- `server.cjs`
- `package.json`

Then on the peer machine:
```bash
npm install
node server.cjs
```

### Option 2: Minimal Backend Only
Create a minimal `package.json` with just backend dependencies:

```json
{
  "name": "wireguard-backend",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5"
  },
  "scripts": {
    "start": "node server.cjs"
  }
}
```

Then:
```bash
npm install
npm start
```

## What the Backend Does

- Runs on port 3001
- Controls WireGuard interfaces (wg0 and wg1) on the local machine
- Creates/updates configs in `/etc/wireguard/`
- Requires sudo permissions for WireGuard operations

## Network Access

The backend accepts connections from any origin (CORS enabled), so the frontend can access it from any machine on the network.

## Notes

- The backend must run on the machine where you want to control WireGuard
- Each machine needs its own backend instance
- The frontend connects to `localhost:3001` to control the local machine's WireGuard

