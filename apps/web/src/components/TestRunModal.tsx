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
      setResult(res);
    } catch (error: any) {
      setResult({ error: error.message || 'Invalid JSON or Execution Failed' });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">Test Workflow</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Input Data (Trigger Payload)</label>
            <textarea
              className="w-full h-40 p-2 border rounded font-mono text-sm"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
            />
          </div>

          {result && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Execution Result</label>
              <div className={`p-3 rounded border text-sm font-mono whitespace-pre-wrap ${result.error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                {JSON.stringify(result, null, 2)}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={handleRun} disabled={isRunning}>
            {isRunning ? 'Running...' : 'Run Test'}
          </Button>
        </div>
      </div>
    </div>
  );
};
