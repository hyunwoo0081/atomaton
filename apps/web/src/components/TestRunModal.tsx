import React, { useState } from 'react';
import { Button } from '@atomaton/ui';

interface TestRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (inputData: any) => Promise<any>;
}

export const TestRunModal: React.FC<TestRunModalProps> = ({ isOpen, onClose, onRun }) => {
  const [inputData, setInputData] = useState(JSON.stringify({
    subject: "Test Email Subject",
    from: "test@example.com",
    body: "This is a test email body."
  }, null, 2));
  const [result, setResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) return null;

  const handleRun = async () => {
    setIsRunning(true);
    setResult(null);
    try {
      const parsedData = JSON.parse(inputData);
      const res = await onRun(parsedData);
      setResult(res.data || res); // Handle axios response or direct data
    } catch (error: any) {
      setResult({ error: error.message || 'Invalid JSON or Execution Failed' });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#0D0E12]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Test Workflow</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">✕</button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/80 mb-2">Input Data (Trigger Payload)</label>
            <textarea
              className="w-full h-40 p-4 bg-white/5 border border-white/10 rounded-xl font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#8A3FFC] transition-all"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
            />
          </div>

          {result && (
            <div className="mb-4 animate-fade-in">
              <label className="block text-sm font-medium text-white/80 mb-2">Execution Result</label>
              <div className={`p-4 rounded-xl border text-sm font-mono whitespace-pre-wrap overflow-auto max-h-60 ${result.error ? 'bg-[#FF2E63]/10 border-[#FF2E63]/30 text-[#FF2E63]' : 'bg-[#00F5A0]/10 border-[#00F5A0]/30 text-[#00F5A0]'}`}>
                {JSON.stringify(result, null, 2)}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={handleRun} disabled={isRunning}>
            {isRunning ? 'Running...' : 'Run Test'}
          </Button>
        </div>
      </div>
    </div>
  );
};
