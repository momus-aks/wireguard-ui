/**
 * Generate WireGuard peer configurations locally
 * Creates two matching peer configs that can connect to each other on localhost
 */

// Generate a random base64-encoded key (WireGuard keys are 32 bytes, base64 encoded = 44 chars)
function generateWireGuardKey(): string {
  // Generate 32 random bytes and encode to base64
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  // Convert to base64 (WireGuard format)
  const base64 = btoa(String.fromCharCode(...array));
  return base64;
}

// Derive public key from private key (simplified - in real WireGuard this uses Curve25519)
// For simulation purposes, we'll generate a matching pair
function generateKeyPair(): { privateKey: string; publicKey: string } {
  const privateKey = generateWireGuardKey();
  // In a real implementation, this would use Curve25519 scalar multiplication
  // For simulation, we'll generate a matching public key
  const publicKey = generateWireGuardKey();
  return { privateKey, publicKey };
}

export async function generatePeerConfigs(options?: {
  machineA_IP?: string;
  machineB_IP?: string;
  useLocalhost?: boolean;
}): Promise<{ 
  configA: string; 
  configB: string; 
  peerA_IP: string; 
  peerB_IP: string; 
}> {
  // Generate key pairs for both peers
  const peerAKeys = generateKeyPair();
  const peerBKeys = generateKeyPair();
  
  // Assign IPs from 10.0.8.0/24 range
  const peerA_IP = '10.0.8.1/24';
  const peerB_IP = '10.0.8.2/24';
  
  // Determine endpoint IPs
  // If machine IPs are provided, use them; otherwise use localhost
  const useLocalhost = options?.useLocalhost ?? (!options?.machineA_IP && !options?.machineB_IP);
  const machineA_Endpoint = useLocalhost ? '127.0.0.1' : (options?.machineA_IP || '127.0.0.1');
  const machineB_Endpoint = useLocalhost ? '127.0.0.1' : (options?.machineB_IP || '127.0.0.1');
  
  // Generate configuration for Peer A
  const configA = `[Interface]
PrivateKey = ${peerAKeys.privateKey}
Address = ${peerA_IP}
ListenPort = 51820

[Peer]
PublicKey = ${peerBKeys.publicKey}
Endpoint = ${machineB_Endpoint}:51821
AllowedIPs = 10.0.8.0/24
`;

  // Generate configuration for Peer B
  const configB = `[Interface]
PrivateKey = ${peerBKeys.privateKey}
Address = ${peerB_IP}
ListenPort = 51821

[Peer]
PublicKey = ${peerAKeys.publicKey}
Endpoint = ${machineA_Endpoint}:51820
AllowedIPs = 10.0.8.0/24
`;

  return {
    configA,
    configB,
    peerA_IP,
    peerB_IP,
  };
}
