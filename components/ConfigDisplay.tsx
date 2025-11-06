import React, { useState } from 'react';
import { Clipboard, ClipboardCheck } from 'lucide-react';

interface ConfigDisplayProps {
  config: string;
  isLoading: boolean;
  wgIp?: string;
}

const ConfigDisplay: React.FC<ConfigDisplayProps> = ({ config, isLoading, wgIp }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (config) {
      navigator.clipboard.writeText(config);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-brand-dark rounded-lg p-4 relative min-h-[240px]">
       <div className="flex justify-between items-center mb-2">
        <h3 className="text-md font-semibold text-gray-300">Generated Configuration</h3>
        {wgIp && <span className="text-sm font-mono bg-brand-light-gray px-2 py-1 rounded">{wgIp}</span>}
       </div>
      <button 
        onClick={handleCopy}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-brand-light-gray rounded-md transition-colors"
        aria-label="Copy configuration"
      >
        {copied ? <ClipboardCheck size={18} className="text-brand-green" /> : <Clipboard size={18} />}
      </button>
      
      {isLoading ? (
        <div className="animate-pulse space-y-3 mt-2">
            <div className="h-4 bg-brand-light-gray rounded w-1/4"></div>
            <div className="h-4 bg-brand-light-gray rounded w-3/4"></div>
            <div className="h-4 bg-brand-light-gray rounded w-1/2"></div>
            <div className="h-4 bg-brand-light-gray rounded w-2/3"></div>
            <div className="h-4 bg-brand-light-gray rounded w-1/4"></div>
            <div className="h-4 bg-brand-light-gray rounded w-4/5"></div>
        </div>
      ) : (
        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono break-all overflow-x-auto">
          {config || 'Generate a configuration to see it here.'}
        </pre>
      )}
    </div>
  );
};

export default ConfigDisplay;
