import React from 'react';
import { Network, Server } from 'lucide-react';
import { MachineStatus } from '../types';

interface NetworkGraphProps {
  statusA: MachineStatus;
  statusB: MachineStatus;
  peerA_IP?: string;
  peerB_IP?: string;
  machineA_IP?: string;
  machineB_IP?: string;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({
  statusA,
  statusB,
  peerA_IP,
  peerB_IP,
  machineA_IP,
  machineB_IP,
}) => {
  const isConnected = statusA === MachineStatus.CONNECTED && statusB === MachineStatus.CONNECTED;
  const isAConnected = statusA === MachineStatus.CONNECTED;
  const isBConnected = statusB === MachineStatus.CONNECTED;

  return (
    <div className="bg-brand-gray rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Network size={20} />
        Network Topology
      </h3>
      
      <div className="flex items-center justify-between">
        {/* Machine A */}
        <div className="flex flex-col items-center">
          <div className={`relative p-4 rounded-lg border-2 transition-all ${
            isAConnected 
              ? 'border-brand-green bg-green-500/10' 
              : 'border-gray-600 bg-brand-light-gray'
          }`}>
            <Server size={32} className={isAConnected ? 'text-brand-green' : 'text-gray-500'} />
            <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-brand-dark bg-brand-green animate-pulse" 
                 style={{ display: isAConnected ? 'block' : 'none' }} />
          </div>
          <p className="mt-2 text-sm font-semibold">Machine A</p>
          {peerA_IP && (
            <p className="text-xs text-gray-400 font-mono mt-1">{peerA_IP}</p>
          )}
          {machineA_IP && (
            <p className="text-xs text-gray-500 font-mono">{machineA_IP}</p>
          )}
        </div>

        {/* Connection Line */}
        <div className="flex-1 mx-4 relative">
          <div className={`h-1 rounded-full transition-all ${
            isConnected 
              ? 'bg-brand-green animate-pulse' 
              : 'bg-gray-600'
          }`} />
          {isConnected && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-brand-green text-xs px-2 py-1 rounded font-mono">
                WireGuard Tunnel
              </div>
            </div>
          )}
        </div>

        {/* Machine B */}
        <div className="flex flex-col items-center">
          <div className={`relative p-4 rounded-lg border-2 transition-all ${
            isBConnected 
              ? 'border-brand-green bg-green-500/10' 
              : 'border-gray-600 bg-brand-light-gray'
          }`}>
            <Server size={32} className={isBConnected ? 'text-brand-green' : 'text-gray-500'} />
            <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-brand-dark bg-brand-green animate-pulse" 
                 style={{ display: isBConnected ? 'block' : 'none' }} />
          </div>
          <p className="mt-2 text-sm font-semibold">Machine B</p>
          {peerB_IP && (
            <p className="text-xs text-gray-400 font-mono mt-1">{peerB_IP}</p>
          )}
          {machineB_IP && (
            <p className="text-xs text-gray-500 font-mono">{machineB_IP}</p>
          )}
        </div>
      </div>

      {/* Connection Details */}
      {isConnected && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Interface A</p>
              <p className="font-mono text-brand-green">wg0</p>
            </div>
            <div>
              <p className="text-gray-400">Interface B</p>
              <p className="font-mono text-brand-green">wg1</p>
            </div>
            <div>
              <p className="text-gray-400">Port A</p>
              <p className="font-mono">51820</p>
            </div>
            <div>
              <p className="text-gray-400">Port B</p>
              <p className="font-mono">51821</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkGraph;

