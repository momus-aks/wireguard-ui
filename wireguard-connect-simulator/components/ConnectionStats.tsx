import React, { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, Zap } from 'lucide-react';
import { LinkStatus } from '../types';

interface ConnectionStatsProps {
  status: LinkStatus;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ConnectionStats: React.FC<ConnectionStatsProps> = ({ status }) => {
  const [dataSent, setDataSent] = useState(0);
  const [dataReceived, setDataReceived] = useState(0);

  useEffect(() => {
    if (status === LinkStatus.ESTABLISHED) {
      const dataInterval = setInterval(() => {
        // Simulate Machine A sending more than B receives
        setDataSent(prev => prev + Math.random() * 250000); 
        // Simulate Machine B sending more than A receives
        setDataReceived(prev => prev + Math.random() * 50000);
      }, 1500);

      return () => {
        clearInterval(dataInterval);
      };
    } else {
        // Reset stats on disconnect
        setDataSent(0);
        setDataReceived(0);
    }
  }, [status]);

  const isEstablished = status === LinkStatus.ESTABLISHED;

  return (
    <div className="flex flex-col items-center justify-center p-4 text-center">
        <div className={`relative flex items-center justify-center w-20 h-20 rounded-full border-2 transition-colors duration-300 ${isEstablished ? 'border-brand-green bg-green-500/10' : 'border-brand-light-gray bg-brand-gray'}`}>
            <Zap size={32} className={`transition-colors duration-300 ${isEstablished ? 'text-brand-green animate-pulse' : 'text-gray-600'}`} />
        </div>
        <h3 className={`mt-3 text-lg font-semibold transition-colors duration-300 ${isEstablished ? 'text-white' : 'text-gray-500'}`}>
            {isEstablished ? 'Link Established' : 'Link Down'}
        </h3>
        {isEstablished && (
            <div className="flex flex-col gap-2 mt-4 font-mono text-white">
                <div className="flex items-center gap-2 text-sm" title="Data sent from A to B">
                    <span className="text-gray-400">A &#8594; B:</span>
                    <span>{formatBytes(dataSent)}</span>
                </div>
                 <div className="flex items-center gap-2 text-sm" title="Data sent from B to A">
                    <span className="text-gray-400">B &#8594; A:</span>
                    <span>{formatBytes(dataReceived)}</span>
                </div>
            </div>
        )}
    </div>
  );
};

export default ConnectionStats;
