import React, { useState, useEffect, useCallback } from 'react';
import { generatePeerConfigs, GeneratedConfigs } from './services/geminiService';
import {
  bringInterfaceUp,
  bringInterfaceDown,
  getInterfaceStatus,
  generatePqcPsk,
  remoteBringInterfaceDown,
  remoteBringInterfaceUp,
} from './apiService';
import { MachineStatus, LinkStatus } from './types';
import ActionButton from './components/ActionButton';
import NetworkMonitor from './components/NetworkMonitor';
import { Copy, CheckCircle2, XCircle } from 'lucide-react';

const App: React.FC = () => {
  const [machineA_IP, setMachineA_IP] = useState('');
  const [machineB_IP, setMachineB_IP] = useState('');

  const [configA, setConfigA] = useState('');
  const [configB, setConfigB] = useState('');
  const [usedPlaceholderKeys, setUsedPlaceholderKeys] = useState(false);
  const [peerA_IP, setPeerA_IP] = useState('');
  const [peerB_IP, setPeerB_IP] = useState('');

  const [statusA, setStatusA] = useState<MachineStatus>(MachineStatus.DISCONNECTED);
  const [linkStatus, setLinkStatus] = useState<LinkStatus>(LinkStatus.DOWN);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [isGeneratingPqc, setIsGeneratingPqc] = useState(false);
  const [pqcError, setPqcError] = useState<string | null>(null);
  const [pqcHex, setPqcHex] = useState('');
  const [pqcBase64, setPqcBase64] = useState('');
  const [peerApiBase, setPeerApiBase] = useState('');

  const pollStatus = useCallback(async () => {
    try {
      const response = await getInterfaceStatus('A');
      const connected = response.isConnected ? MachineStatus.CONNECTED : MachineStatus.DISCONNECTED;
      setStatusA(connected);
      setLinkStatus(connected === MachineStatus.CONNECTED ? LinkStatus.ESTABLISHED : LinkStatus.DOWN);
    } catch (err) {
      setStatusA(MachineStatus.DISCONNECTED);
      setLinkStatus(LinkStatus.DOWN);
    }
  }, []);

  useEffect(() => {
    pollStatus();
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [pollStatus]);

  useEffect(() => {
    if (!peerApiBase && machineB_IP) {
      setPeerApiBase(`http://${machineB_IP}:3001/api`);
    }
  }, [machineB_IP, peerApiBase]);

  const handleGenerateConfigs = async () => {
    setIsLoading(true);
    setError(null);

    if (statusA === MachineStatus.CONNECTED) {
      try {
        await bringInterfaceDown('A');
      } catch (downError) {
        console.warn('Failed to bring interface down before regenerating configs:', downError);
      }
    }

    try {
      const useLocalhost = !machineA_IP && !machineB_IP;
      const { configA, configB, peerA_IP, peerB_IP, usedPlaceholderKeys } = await generatePeerConfigs({
        machineA_IP: machineA_IP || undefined,
        machineB_IP: machineB_IP || undefined,
        useLocalhost,
      });

      setConfigA(configA.trim());
      setConfigB(configB.trim());
      setPeerA_IP(peerA_IP);
      setPeerB_IP(peerB_IP);
      setUsedPlaceholderKeys(usedPlaceholderKeys);
      setStatusA(MachineStatus.DISCONNECTED);
      setLinkStatus(LinkStatus.DOWN);
      setPqcBase64('');
      setPqcHex('');
      setPqcError(null);
      setCopiedField(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate configurations.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!configA) {
      setError('Generate the configuration first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await bringInterfaceUp('A', configA);
      await pollStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bring interface up.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await bringInterfaceDown('A');
      await pollStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bring interface down.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (value: string, field: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  const handleGeneratePqc = async () => {
    setIsGeneratingPqc(true);
    setPqcError(null);
    try {
      const result = await generatePqcPsk();
      setPqcHex(result.hex);
      setPqcBase64(result.base64);
      setCopiedField(null);
    } catch (err) {
      setPqcError(err instanceof Error ? err.message : 'Failed to generate ML-KEM PSK.');
    } finally {
      setIsGeneratingPqc(false);
    }
  };

  const resolvePeerApiBase = () => {
    const trimmed = peerApiBase.trim();
    if (trimmed) {
      return trimmed;
    }
    if (machineB_IP) {
      return `http://${machineB_IP}:3001/api`;
    }
    return '';
  };

  const applyPskToConfig = (config: string, pskBase64: string) => {
    const lines = config.split(/\r?\n/);
    const result: string[] = [];
    let inPeer = false;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('[')) {
        if (trimmed === '[Peer]') {
          inPeer = true;
          result.push(line);
          result.push(`PresharedKey = ${pskBase64}`);
          return;
        } else {
          inPeer = false;
        }
      }

      if (inPeer && trimmed.toLowerCase().startsWith('presharedkey')) {
        return;
      }

      result.push(line);
    });

    return result.join('\n').trim() + '\n';
  };

  const handleConnectBoth = async () => {
    if (!configA || !configB) {
      setError('Generate configurations before connecting.');
      return;
    }

    const remoteBase = resolvePeerApiBase();
    if (!remoteBase) {
      setError('Specify the peer API URL before connecting.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPqcError(null);

    try {
      let currentPskBase64 = pqcBase64;
      if (!currentPskBase64) {
        const result = await generatePqcPsk();
        currentPskBase64 = result.base64;
        setPqcBase64(result.base64);
        setPqcHex(result.hex);
      }

      const configAWithPsk = applyPskToConfig(configA, currentPskBase64);
      const configBWithPsk = applyPskToConfig(configB, currentPskBase64);

      try {
        await remoteBringInterfaceDown(remoteBase, 'B');
      } catch (downErr) {
        console.warn('Remote interface down failed (ignored):', downErr);
      }

      await remoteBringInterfaceUp(remoteBase, 'B', configBWithPsk);

      try {
        await bringInterfaceDown('A');
      } catch (downErr) {
        console.warn('Local interface down failed (ignored):', downErr);
      }

      await bringInterfaceUp('A', configAWithPsk);

      setConfigA(configAWithPsk);
      setConfigB(configBWithPsk);

      await pollStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect both machines.');
    } finally {
      setIsLoading(false);
    }
  };

  const statusBadge = statusA === MachineStatus.CONNECTED ? (
    <span className="inline-flex items-center gap-2 text-sm text-brand-green bg-brand-green/20 px-3 py-1 rounded-full">
      <CheckCircle2 size={16} /> Interface up
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 text-sm text-red-400 bg-red-400/20 px-3 py-1 rounded-full">
      <XCircle size={16} /> Interface down
    </span>
  );

  return (
    <div className="bg-brand-dark min-h-screen text-white font-sans">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        <header className="space-y-2 text-center">
          <h1 className="text-4xl font-bold">WireGuard Quick Connect</h1>
          <p className="text-gray-400">
            Generate configs, bring up your local interface, and monitor traffic in seconds.
          </p>
        </header>

        <section className="bg-brand-gray rounded-xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Machine A IP (this machine)</label>
              <input
                type="text"
                value={machineA_IP}
                onChange={(e) => setMachineA_IP(e.target.value)}
                placeholder="e.g., 192.168.56.10"
                className="w-full px-3 py-2 bg-brand-dark border border-gray-700 rounded focus:outline-none focus:border-brand-green"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Machine B IP (peer)</label>
              <input
                type="text"
                value={machineB_IP}
                onChange={(e) => setMachineB_IP(e.target.value)}
                placeholder="e.g., 192.168.56.11"
                className="w-full px-3 py-2 bg-brand-dark border border-gray-700 rounded focus:outline-none focus:border-brand-green"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Peer API URL (Machine B backend)</label>
              <input
                type="text"
                value={peerApiBase}
                onChange={(e) => setPeerApiBase(e.target.value)}
                placeholder="http://192.168.56.11:3001/api"
                className="w-full px-3 py-2 bg-brand-dark border border-gray-700 rounded focus:outline-none focus:border-brand-green"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used to push configs and start the interface on the peer automatically.
              </p>
            </div>
          </div>

          <ActionButton onClick={handleGenerateConfigs} disabled={isLoading}>
            {isLoading ? 'Working...' : 'Generate Configurations'}
          </ActionButton>

          {(error || (statusA === MachineStatus.CONNECTED && usedPlaceholderKeys)) && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg">
              {error || 'Warning: Using placeholder WireGuard keys because remote key generation failed. Connection will not authenticate.'}
            </div>
          )}
        </section>

        <section className="bg-brand-gray rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Post-Quantum PSK (ML-KEM-768)</h2>
              <p className="text-sm text-gray-500">
                Generates a 32-byte shared secret using liboqs. Build helper via <code>./pqc code/build.sh</code>.
              </p>
            </div>
            <span className="text-xs text-gray-500">Result usable in WireGuard’s <code>PresharedKey</code>.</span>
          </div>

          <ActionButton onClick={handleGeneratePqc} disabled={isGeneratingPqc}>
            {isGeneratingPqc ? 'Generating...' : 'Generate ML-KEM PSK'}
          </ActionButton>

          {pqcError && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg">
              {pqcError}
            </div>
          )}

          <ActionButton
            onClick={handleConnectBoth}
            disabled={isLoading || !configA || !configB}
            variant="secondary"
          >
            {isLoading ? 'Connecting...' : 'Push Configs & Connect Both Machines'}
          </ActionButton>
          <p className="text-xs text-gray-500">
            Generates a post-quantum preshared key if needed, syncs Machine B, and brings both WireGuard interfaces up.
          </p>

          {(pqcHex || pqcBase64) && (
            <div className="space-y-3">
              {pqcBase64 && (
                <div>
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                    <span>Base64</span>
                    <button
                      onClick={() => copyToClipboard(pqcBase64, 'pqc-base64')}
                      className="inline-flex items-center gap-2 text-xs text-gray-300 hover:text-white"
                    >
                      <Copy size={14} /> {copiedField === 'pqc-base64' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="bg-brand-dark rounded-lg p-3 text-xs text-gray-200 break-all">
                    {pqcBase64}
                  </pre>
                </div>
              )}

              {pqcHex && (
                <div>
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                    <span>Hex</span>
                    <button
                      onClick={() => copyToClipboard(pqcHex, 'pqc-hex')}
                      className="inline-flex items-center gap-2 text-xs text-gray-300 hover:text-white"
                    >
                      <Copy size={14} /> {copiedField === 'pqc-hex' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="bg-brand-dark rounded-lg p-3 text-xs text-gray-200 break-all">
                    {pqcHex}
                  </pre>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-brand-gray rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Machine A Configuration</h2>
                <p className="text-xs text-gray-500">Apply locally (interface will be brought up from here)</p>
              </div>
              <button
                onClick={() => copyToClipboard(configA, 'A')}
                className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white"
                disabled={!configA}
              >
                <Copy size={16} /> {copiedField === 'A' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="bg-brand-dark rounded-lg p-4 text-sm text-gray-200 whitespace-pre-wrap break-all min-h-[220px]">
              {configA || 'Generate to view configuration.'}
            </pre>
            {peerA_IP && (
              <p className="text-xs text-gray-500">WireGuard address: {peerA_IP}</p>
            )}
          </div>

          <div className="bg-brand-gray rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Machine B Configuration</h2>
                <p className="text-xs text-gray-500">Copy and apply on the peer machine</p>
              </div>
              <button
                onClick={() => copyToClipboard(configB, 'B')}
                className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white"
                disabled={!configB}
              >
                <Copy size={16} /> {copiedField === 'B' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="bg-brand-dark rounded-lg p-4 text-sm text-gray-200 whitespace-pre-wrap break-all min-h-[220px]">
              {configB || 'Generate to view configuration.'}
            </pre>
            {peerB_IP && (
              <p className="text-xs text-gray-500">WireGuard address: {peerB_IP}</p>
            )}
          </div>
        </section>

        <section className="bg-brand-gray rounded-xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Machine A Control</h2>
              <p className="text-sm text-gray-500">Bring the local interface up or down</p>
            </div>
            {statusBadge}
          </div>

          <div className="flex flex-wrap gap-3">
            <ActionButton onClick={handleConnect} disabled={isLoading || !configA || statusA === MachineStatus.CONNECTED}>
              Up Interface
            </ActionButton>
            <ActionButton
              onClick={handleDisconnect}
              disabled={isLoading || statusA === MachineStatus.DISCONNECTED}
              variant="danger"
            >
              Down Interface
            </ActionButton>
          </div>
        </section>

        <section className="bg-brand-gray rounded-xl p-6">
          <NetworkMonitor status={linkStatus} machine="A" />
        </section>
      </div>
    </div>
  );
};

export default App;
