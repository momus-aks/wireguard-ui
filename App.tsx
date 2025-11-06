import React, { useState, useEffect, useCallback } from 'react';
import MachinePanel from './components/MachinePanel';
import ConnectionStats from './components/ConnectionStats';
import ActionButton from './components/ActionButton';
import NetworkGraph from './components/NetworkGraph';
import NetworkMonitor from './components/NetworkMonitor';
import { generatePeerConfigs } from './services/geminiService';
import { bringInterfaceUp, bringInterfaceDown, getInterfaceStatus } from './apiService';
import { MachineStatus, LinkStatus } from './types';
import { Sparkles, ServerCrash } from 'lucide-react';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [configA, setConfigA] = useState('');
  const [configB, setConfigB] = useState('');
  const [peerA_IP, setPeerA_IP] = useState('');
  const [peerB_IP, setPeerB_IP] = useState('');
  
  // IP addresses for the two machines (for remote connections)
  const [machineA_IP, setMachineA_IP] = useState('');
  const [machineB_IP, setMachineB_IP] = useState('');
  const [useLocalhost, setUseLocalhost] = useState(true);
  const [useNetworkIP, setUseNetworkIP] = useState(false);
  
  // Get machine's network IP for testing
  const [networkIP, setNetworkIP] = useState<string>('');
  
  useEffect(() => {
    // Try to get the machine's network IP via the backend
    fetch('http://localhost:3001/api/network-ip')
      .then(res => res.json())
      .then(data => {
        if (data.ip) {
          setNetworkIP(data.ip);
        }
      })
      .catch(() => {
        // Fallback: try to detect from window location
        const hostname = window.location.hostname;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
          setNetworkIP(hostname);
        }
      });
  }, []);
  
  // Update IPs when networkIP or useNetworkIP changes
  useEffect(() => {
    if (useNetworkIP && networkIP) {
      setMachineA_IP(networkIP);
      setMachineB_IP(networkIP);
    }
  }, [useNetworkIP, networkIP]);

  const [statusA, setStatusA] = useState<MachineStatus>(MachineStatus.DISCONNECTED);
  const [statusB, setStatusB] = useState<MachineStatus>(MachineStatus.DISCONNECTED);
  const [linkStatus, setLinkStatus] = useState<LinkStatus>(LinkStatus.DOWN);

  const handleGenerateConfigs = async () => {
    setIsLoading(true);
    setError(null);
    if (statusA !== MachineStatus.DISCONNECTED) await handleToggleMachine('A');
    if (statusB !== MachineStatus.DISCONNECTED) await handleToggleMachine('B');
    
    setConfigA('');
    setConfigB('');
    setPeerA_IP('');
    setPeerB_IP('');
    setStatusA(MachineStatus.DISCONNECTED);
    setStatusB(MachineStatus.DISCONNECTED);

    try {
      // Determine which IPs to use
      let finalMachineA_IP = undefined;
      let finalMachineB_IP = undefined;
      let finalUseLocalhost = useLocalhost;
      
      if (useNetworkIP && networkIP) {
        // Test mode: use network IP for both (simulates remote connection on same machine)
        finalMachineA_IP = networkIP;
        finalMachineB_IP = networkIP;
        finalUseLocalhost = false;
      } else if (!useLocalhost) {
        finalMachineA_IP = machineA_IP;
        finalMachineB_IP = machineB_IP;
      }
      
      const { configA, configB, peerA_IP, peerB_IP } = await generatePeerConfigs({
        machineA_IP: finalMachineA_IP,
        machineB_IP: finalMachineB_IP,
        useLocalhost: finalUseLocalhost
      });
      setConfigA(configA);
      setConfigB(configB);
      setPeerA_IP(peerA_IP);
      setPeerB_IP(peerB_IP);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMachine = async (machine: 'A' | 'B') => {
    const status = machine === 'A' ? statusA : statusB;
    const setStatus = machine === 'A' ? setStatusA : setStatusB;
    const config = machine === 'A' ? configA : configB;

    setStatus(MachineStatus.CONNECTING); // Visually indicate activity
    setError(null);

    try {
      if (status === MachineStatus.DISCONNECTED) {
        await bringInterfaceUp(machine, config);
      } else {
        await bringInterfaceDown(machine);
      }
      // After action, poll for status immediately
      pollStatus();
    } catch (err) {
      setError(err instanceof Error ? `Machine ${machine}: ${err.message}` : 'An unknown error occurred.');
      // Revert status on failure
      setStatus(status);
    }
  };

  const pollStatus = useCallback(async () => {
    try {
      const [statusResultA, statusResultB] = await Promise.all([
        getInterfaceStatus('A'),
        getInterfaceStatus('B'),
      ]);
      setStatusA(statusResultA.isConnected ? MachineStatus.CONNECTED : MachineStatus.DISCONNECTED);
      setStatusB(statusResultB.isConnected ? MachineStatus.CONNECTED : MachineStatus.DISCONNECTED);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to backend server. Is it running?');
      // If we can't poll, assume disconnected
      setStatusA(MachineStatus.DISCONNECTED);
      setStatusB(MachineStatus.DISCONNECTED);
    }
  }, []);

  useEffect(() => {
    // Initial status check
    pollStatus();
    // Poll every 5 seconds to keep UI in sync with reality
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [pollStatus]);

  useEffect(() => {
    if (statusA === MachineStatus.CONNECTED && statusB === MachineStatus.CONNECTED) {
      setLinkStatus(LinkStatus.ESTABLISHED);
    } else {
      setLinkStatus(LinkStatus.DOWN);
    }
  }, [statusA, statusB]);

  return (
    <div className="bg-brand-dark min-h-screen text-white font-sans">
      <div className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">WireGuard Controller</h1>
          <p className="text-lg text-gray-400">Generate WireGuard peer configs and control your local interfaces.</p>
          <p className="text-sm text-gray-500 mt-2">
            Accessible from network: <code className="bg-brand-gray px-2 py-1 rounded">http://YOUR_IP:3000</code>
          </p>
        </header>

        <main>
          <div className="max-w-md mx-auto mb-8">
            <div className="bg-brand-gray rounded-lg p-4 mb-4">
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useLocalhost}
                    onChange={(e) => {
                      setUseLocalhost(e.target.checked);
                      if (e.target.checked) {
                        setUseNetworkIP(false);
                      }
                    }}
                    className="w-4 h-4 text-brand-green bg-brand-light-gray border-gray-600 rounded focus:ring-brand-green"
                  />
                  <span className="text-sm text-gray-300">Use localhost (single machine)</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useNetworkIP}
                    onChange={(e) => {
                      setUseNetworkIP(e.target.checked);
                      if (e.target.checked) {
                        setUseLocalhost(false);
                        if (networkIP) {
                          setMachineA_IP(networkIP);
                          setMachineB_IP(networkIP);
                        }
                      }
                    }}
                    className="w-4 h-4 text-brand-green bg-brand-light-gray border-gray-600 rounded focus:ring-brand-green"
                  />
                  <span className="text-sm text-gray-300">
                    Test with network IP ({networkIP || 'detecting...'})
                  </span>
                  <span className="text-xs text-gray-500">(Simulates remote connection on same machine)</span>
                </label>
              </div>
              
              {!useLocalhost && !useNetworkIP && (
                <div className="space-y-3 mt-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Machine A IP Address</label>
                    <input
                      type="text"
                      value={machineA_IP}
                      onChange={(e) => setMachineA_IP(e.target.value)}
                      placeholder="e.g., 192.168.1.100 or WSL IP"
                      className="w-full px-3 py-2 bg-brand-light-gray border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-brand-green"
                    />
                    <p className="text-xs text-gray-500 mt-1">Public IP or local network IP of Machine A</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Machine B IP Address</label>
                    <input
                      type="text"
                      value={machineB_IP}
                      onChange={(e) => setMachineB_IP(e.target.value)}
                      placeholder="e.g., 192.168.1.101 or Windows host IP"
                      className="w-full px-3 py-2 bg-brand-light-gray border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-brand-green"
                    />
                    <p className="text-xs text-gray-500 mt-1">Public IP or local network IP of Machine B</p>
                  </div>
                </div>
              )}
            </div>
            
            <ActionButton onClick={handleGenerateConfigs} disabled={isLoading}>
              <Sparkles size={20} />
              {isLoading ? 'Generating Configs...' : 'Generate New Peer Configs'}
            </ActionButton>
            {error && (
              <div className="mt-4 bg-red-500/20 border border-red-500/30 text-red-400 p-3 rounded-lg flex items-center gap-3">
                <ServerCrash size={20} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-start gap-8">
            <MachinePanel
              machineName="Machine A"
              status={statusA}
              config={configA}
              isLoading={isLoading}
              wgIp={peerA_IP}
              targetIp={peerB_IP}
              onConnect={() => handleToggleMachine('A')}
              onDisconnect={() => handleToggleMachine('A')}
            />

            <div className="self-center pt-24">
              <ConnectionStats status={linkStatus} />
            </div>

            <MachinePanel
              machineName="Machine B"
              status={statusB}
              config={configB}
              isLoading={isLoading}
              wgIp={peerB_IP}
              targetIp={peerA_IP}
              onConnect={() => handleToggleMachine('B')}
              onDisconnect={() => handleToggleMachine('B')}
            />
          </div>

          {/* Network Graph and Monitoring */}
          {(statusA !== MachineStatus.DISCONNECTED || statusB !== MachineStatus.DISCONNECTED) && (
            <div className="mt-8 space-y-6">
              <NetworkGraph
                statusA={statusA}
                statusB={statusB}
                peerA_IP={peerA_IP}
                peerB_IP={peerB_IP}
                machineA_IP={machineA_IP || (useNetworkIP ? networkIP : undefined)}
                machineB_IP={machineB_IP || (useNetworkIP ? networkIP : undefined)}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <NetworkMonitor status={linkStatus} machine="A" />
                <NetworkMonitor status={linkStatus} machine="B" />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
