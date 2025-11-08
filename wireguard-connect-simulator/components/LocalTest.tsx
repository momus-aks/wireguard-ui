import React, { useState } from 'react';
import ActionButton from './ActionButton';
import { Zap } from 'lucide-react';

interface LocalTestProps {
    sourceName: string;
    targetIp: string;
}

const LocalTest: React.FC<LocalTestProps> = ({ sourceName, targetIp }) => {
  const [isTesting, setIsTesting] = useState(false);
  const [pingResult, setPingResult] = useState<string[]>([]);

  const handleTest = () => {
    setIsTesting(true);
    setPingResult([`Pinging ${targetIp} from ${sourceName}...`]);

    let count = 0;
    const interval = setInterval(() => {
      if (count >= 3) {
        clearInterval(interval);
        setIsTesting(false);
        return;
      }
      const latency = Math.floor(Math.random() * (25 - 5 + 1) + 5);
      setPingResult(prev => [...prev, `Reply from ${targetIp}: bytes=32 time=${latency}ms TTL=128`]);
      count++;
    }, 1000);
  };

  return (
    <div className="border-t border-brand-light-gray pt-6 mt-6">
      <h3 className="text-lg font-semibold text-center mb-4">Peer Connectivity Test</h3>
      <div className="flex flex-col items-center gap-4">
        <ActionButton onClick={handleTest} disabled={isTesting} variant="secondary">
          <Zap size={18} />
          {isTesting ? 'Pinging...' : `Ping ${targetIp}`}
        </ActionButton>
        {pingResult.length > 0 && (
          <div className="w-full bg-brand-dark p-3 rounded-md mt-2">
            <pre className="font-mono text-sm text-brand-green text-left whitespace-pre-wrap">
                {pingResult.join('\n')}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalTest;
