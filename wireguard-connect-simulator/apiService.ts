// Detect the API base URL based on current hostname
// This allows the app to work when accessed via network IP
// Each machine should run its own backend on port 3001
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }
  return `http://${hostname}:3001/api`;
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

export async function generatePqcPsk(): Promise<{ hex: string; base64: string; algorithm: string }> {
  const response = await fetch(`${API_BASE_URL}/pqc/generate-psk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate PQC PSK.');
  }

  return response.json();
}

const normalizeRemoteBase = (base: string) => {
  const trimmed = base.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) {
    return trimmed;
  }
  return `${trimmed}/api`;
};

async function remoteRequest<T = any>(
  apiBase: string,
  path: string,
  options: RequestInit
): Promise<T> {
  const response = await fetch(`${normalizeRemoteBase(apiBase)}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorMessage = 'Remote request failed.';
    try {
      const data = await response.json();
      errorMessage = data.error || errorMessage;
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(errorMessage);
  }

  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

export async function remoteBringInterfaceDown(apiBase: string, machine: 'A' | 'B') {
  return remoteRequest(apiBase, '/down', {
    method: 'POST',
    body: JSON.stringify({ machine }),
  });
}

export async function remoteBringInterfaceUp(apiBase: string, machine: 'A' | 'B', config: string) {
  return remoteRequest(apiBase, '/up', {
    method: 'POST',
    body: JSON.stringify({ machine, config }),
  });
}

export async function generateWireGuardKeyPairs(): Promise<{
  peerA: { privateKey: string; publicKey: string };
  peerB: { privateKey: string; publicKey: string };
}> {
  const response = await fetch(`${API_BASE_URL}/generate-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate WireGuard keys.');
  }

  return response.json();
}
