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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-[500px] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">Global Settings</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <div className="p-6 flex-1">
          <div className="mb-6">
            <label className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600"
                checked={globalSettings.enableFailureAlert}
                onChange={(e) => updateGlobalSettings({ enableFailureAlert: e.target.checked })}
              />
              <span className="text-sm font-medium text-gray-900">Enable Failure Notification</span>
            </label>
            <p className="text-xs text-gray-500 ml-7">
              Send an alert when the workflow fails after all retries.
            </p>
          </div>

          {globalSettings.enableFailureAlert && (
            <Input
              label="Discord Webhook URL for Alerts"
              placeholder="https://discord.com/api/webhooks/..."
              value={globalSettings.failureWebhookUrl}
              onChange={(e) => updateGlobalSettings({ failureWebhookUrl: e.target.value })}
            />
          )}
        </div>

        <div className="p-4 border-t flex justify-end space-x-2">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
};
