import React from 'react';
import { MachineStatus } from '../types';
import { ShieldOff, Loader, ShieldCheck } from 'lucide-react';

interface StatusDisplayProps {
  status: MachineStatus;
}

const statusConfig = {
  [MachineStatus.DISCONNECTED]: {
    text: 'Disconnected',
    icon: <ShieldOff size={24} />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  [MachineStatus.CONNECTING]: {
    text: 'Connecting...',
    icon: <Loader size={24} className="animate-spin" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  [MachineStatus.CONNECTED]: {
    text: 'Connected & Secure',
    icon: <ShieldCheck size={24} />,
    color: 'text-brand-green',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
};

const StatusDisplay: React.FC<StatusDisplayProps> = ({ status }) => {
  const { text, icon, color, bgColor, borderColor } = statusConfig[status];

  return (
    <div className={`flex items-center justify-center p-4 rounded-lg border ${bgColor} ${borderColor} transition-all duration-300`}>
      <div className={`mr-4 ${color}`}>{icon}</div>
      <div>
        <p className={`font-semibold text-lg ${color}`}>{text}</p>
        <p className="text-sm text-gray-400">
          {status === MachineStatus.DISCONNECTED ? 'Interface is down. Ready to connect.' : status === MachineStatus.CONNECTING ? 'Establishing secure tunnel...' : 'Your traffic is now routed securely.'}
        </p>
      </div>
    </div>
  );
};

export default StatusDisplay;
