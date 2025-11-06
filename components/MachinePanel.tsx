import React from 'react';
import { MachineStatus } from '../types';
import StatusDisplay from './StatusDisplay';
import ConfigDisplay from './ConfigDisplay';
import ActionButton from './ActionButton';
import LocalTest from './LocalTest';
import { Power, PowerOff } from 'lucide-react';

interface MachinePanelProps {
  machineName: string;
  status: MachineStatus;
  config: string;
  isLoading: boolean;
  wgIp?: string;
  targetIp?: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

const MachinePanel: React.FC<MachinePanelProps> = ({
  machineName,
  status,
  config,
  isLoading,
  wgIp,
  targetIp,
  onConnect,
  onDisconnect,
}) => {
  const isConnected = status === MachineStatus.CONNECTED;
  const isConnecting = status === MachineStatus.CONNECTING;

  return (
    <div className="bg-brand-gray rounded-xl p-6 flex flex-col gap-6">
      <h2 className="text-xl font-bold text-center text-white">{machineName}</h2>
      <StatusDisplay status={status} />
      <ConfigDisplay config={config} isLoading={isLoading} wgIp={wgIp} />
      <div className="flex flex-col gap-3">
        {!isConnected ? (
          <ActionButton onClick={onConnect} disabled={isConnecting || isLoading || !config}>
            <Power size={18} />
            {isConnecting ? 'Working...' : 'Up Interface'}
          </ActionButton>
        ) : (
          <ActionButton onClick={onDisconnect} disabled={isConnecting} variant="danger">
            <PowerOff size={18} />
            {isConnecting ? 'Working...' : 'Down Interface'}
          </ActionButton>
        )}
      </div>
      {isConnected && targetIp && (
        <LocalTest sourceName={machineName} targetIp={targetIp.split('/')[0]} />
      )}
    </div>
  );
};

export default MachinePanel;
