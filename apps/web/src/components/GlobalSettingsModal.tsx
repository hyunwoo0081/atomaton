import React from 'react';
import { Button, Input } from '@atomaton/ui';
import { useWorkflowStore } from '../store/workflowStore';

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose }) => {
  const { globalSettings, updateGlobalSettings } = useWorkflowStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#0D0E12]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl w-[500px] flex flex-col">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Global Settings</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">✕</button>
        </div>
        
        <div className="p-8 flex-1">
          <div className="mb-8">
            <label className="flex items-center space-x-3 mb-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={globalSettings.enableFailureAlert}
                  onChange={(e) => updateGlobalSettings({ enableFailureAlert: e.target.checked })}
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8A3FFC]"></div>
              </div>
              <span className="text-base font-medium text-white group-hover:text-[#8A3FFC] transition-colors">Enable Failure Notification</span>
            </label>
            <p className="text-sm text-white/50 ml-14">
              Send an alert when the workflow fails after all retries.
            </p>
          </div>

          {globalSettings.enableFailureAlert && (
            <div className="animate-fade-in">
              <Input
                label="Discord Webhook URL for Alerts"
                placeholder="https://discord.com/api/webhooks/..."
                value={globalSettings.failureWebhookUrl}
                onChange={(e) => updateGlobalSettings({ failureWebhookUrl: e.target.value })}
              />
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 flex justify-end space-x-3">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
};
