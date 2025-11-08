import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Download, Upload, Clock } from 'lucide-react';
import { LinkStatus } from '../types';
import { getNetworkStats } from '../apiService';

interface NetworkStats {
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  lastHandshake: string;
  transferRate: number;
}

interface NetworkMonitorProps {
  status: LinkStatus;
  machine: 'A' | 'B';
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatMbps = (bytesPerSecond: number): string => {
  if (bytesPerSecond <= 0) {
    return '0 Mbps';
  }
  const mbps = (bytesPerSecond * 8) / 1_000_000;
  const precision = mbps >= 10 ? 1 : 2;
  return `${mbps.toFixed(precision)} Mbps`;
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.floor(seconds)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
};

const NetworkMonitor: React.FC<NetworkMonitorProps> = ({ status, machine }) => {
  const [stats, setStats] = useState<NetworkStats>({
    bytesReceived: 0,
    bytesSent: 0,
    packetsReceived: 0,
    packetsSent: 0,
    lastHandshake: 'Never',
    transferRate: 0,
  });

  const [history, setHistory] = useState<number[]>([]);
  const [peakRate, setPeakRate] = useState(0);
  const prevBytesRef = React.useRef({ received: 0, sent: 0, timestamp: Date.now() });
  const maxHistory = 30;

  useEffect(() => {
    if (status === LinkStatus.ESTABLISHED) {
      const interval = setInterval(async () => {
        try {
          const data = await getNetworkStats(machine);

          // Use backend's calculated transferRate (it's more accurate)
          setStats(data);

          // Update transfer rate history for graph (always append, even if 0)
          setHistory(prev => {
            const newHistory = [...prev, Math.max(0, data.transferRate || 0)];
            const sliced = newHistory.slice(-maxHistory);
            setPeakRate(Math.max(...sliced, 0));
            return sliced;
          });

          if (data.transferRate > 0 || data.bytesReceived > 0 || data.bytesSent > 0) {
            console.log(`[Monitor ${machine}] Rate: ${data.transferRate.toFixed(2)} B/s, RX: ${data.bytesReceived}, TX: ${data.bytesSent}`);
          }
        } catch (error) {
          console.error(`[Monitor ${machine}] Fetch error:`, error);
          // Fallback to simulated data if backend unavailable
          const simulatedRate = Math.random() * 1000;
          setStats(prev => ({
            ...prev,
            bytesReceived: prev.bytesReceived + Math.random() * 50000,
            bytesSent: prev.bytesSent + Math.random() * 25000,
            packetsReceived: prev.packetsReceived + Math.floor(Math.random() * 10),
            packetsSent: prev.packetsSent + Math.floor(Math.random() * 5),
            transferRate: simulatedRate,
          }));
          
          setHistory(prev => {
            const newHistory = [...prev, simulatedRate];
            const sliced = newHistory.slice(-maxHistory);
            setPeakRate(Math.max(...sliced, 0));
            return sliced;
          });
        }
      }, 2000);

      return () => clearInterval(interval);
    } else {
      setStats({
        bytesReceived: 0,
        bytesSent: 0,
        packetsReceived: 0,
        packetsSent: 0,
        lastHandshake: 'Never',
        transferRate: 0,
      });
      setHistory([]);
      setPeakRate(0);
      prevBytesRef.current = { received: 0, sent: 0, timestamp: Date.now() };
    }
  }, [status, machine]);

  const isEstablished = status === LinkStatus.ESTABLISHED;
  const maxRate = Math.max(...history, stats.transferRate || 1, 1);

  return (
    <div className="bg-brand-gray rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Activity size={20} />
        Network Monitor - Machine {machine}
      </h3>

      {isEstablished ? (
        <>
          {/* Transfer Rate Graph */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm text-gray-400 block">Transfer Rate</span>
                <span className="text-xs text-gray-500">updates every 2s</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono block">{formatMbps(stats.transferRate)}</span>
                <span className="text-xs text-gray-500">Peak (window): {formatMbps(peakRate)}</span>
              </div>
            </div>
            <div className="h-24 bg-brand-dark rounded-lg p-2 flex items-end gap-1">
              {history.length > 0 ? (
                history.map((rate, idx) => {
                  const heightPercent = maxRate > 0 ? Math.max((rate / maxRate) * 100, 1) : 0;
                  return (
                    <div
                      key={idx}
                      className="flex-1 bg-brand-green rounded-t transition-all hover:bg-green-400"
                      style={{
                        height: `${heightPercent}%`,
                        minHeight: '2px',
                      }}
                      title={formatMbps(rate)}
                    />
                  );
                })
              ) : (
                <div className="w-full text-center text-gray-500 text-xs py-4">
                  Waiting for data...
                </div>
              )}
            </div>
            {history.length > 0 && (
              <div className="text-xs text-gray-500 mt-1 text-center">
                {history.length} data points • Max: {formatMbps(maxRate)}
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-brand-dark rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Download size={16} className="text-blue-400" />
                <span className="text-sm text-gray-400">Received</span>
              </div>
              <p className="text-xl font-mono font-semibold">{formatBytes(stats.bytesReceived)}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.packetsReceived.toLocaleString()} packets</p>
            </div>

            <div className="bg-brand-dark rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Upload size={16} className="text-green-400" />
                <span className="text-sm text-gray-400">Sent</span>
              </div>
              <p className="text-xl font-mono font-semibold">{formatBytes(stats.bytesSent)}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.packetsSent.toLocaleString()} packets</p>
            </div>

            <div className="bg-brand-dark rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-yellow-400" />
                <span className="text-sm text-gray-400">Total</span>
              </div>
              <p className="text-xl font-mono font-semibold">
                {formatBytes(stats.bytesReceived + stats.bytesSent)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {(stats.packetsReceived + stats.packetsSent).toLocaleString()} total packets
              </p>
            </div>

            <div className="bg-brand-dark rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-purple-400" />
                <span className="text-sm text-gray-400">Last Handshake</span>
              </div>
              <p className="text-sm font-mono">{stats.lastHandshake}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Activity size={48} className="mx-auto mb-2 opacity-50" />
          <p>No active connection</p>
          <p className="text-sm mt-1">Statistics will appear when connection is established</p>
        </div>
      )}
    </div>
  );
};

export default NetworkMonitor;

