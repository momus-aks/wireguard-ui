// Detect the API base URL based on current hostname
// This allows the app to work when accessed via network IP
// Each machine should run its own backend on port 3001
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  // Always try to connect to localhost:3001 first (local backend)
  // This ensures each machine controls its own WireGuard interface
  // If accessing from another machine, that machine needs its own backend running
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

export async function bringInterfaceUp(machine: 'A' | 'B', config: string) {
  const response = await fetch(`${API_BASE_URL}/up`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ machine, config }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to bring interface up.');
  }
  return response.json();
}

export async function bringInterfaceDown(machine: 'A' | 'B') {
  const response = await fetch(`${API_BASE_URL}/down`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ machine }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to bring interface down.');
  }
  return response.json();
}

export async function getInterfaceStatus(machine: 'A' | 'B'): Promise<{ isConnected: boolean }> {
  const response = await fetch(`${API_BASE_URL}/status/${machine}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch interface status.');
  }
  return response.json();
}

export async function getNetworkStats(machine: 'A' | 'B'): Promise<{
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  lastHandshake: string;
  transferRate: number;
}> {
  const response = await fetch(`${API_BASE_URL}/stats/${machine}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch network statistics.');
  }
  return response.json();
}
