import React, { useState } from 'react';
import { Button, Input } from '@atomaton/ui';
import { api } from '../utils/api';
import { useQueryClient } from '@tanstack/react-query';

interface AccountConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountConnectionModal: React.FC<AccountConnectionModalProps> = ({ isOpen, onClose }) => {
  const [type, setType] = useState<'NAVER_IMAP' | 'NOTION'>('NAVER_IMAP');
  const [name, setName] = useState('');
  const [config, setConfig] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/accounts', { type, config: { ...config, name } });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      onClose();
      // Reset form
      setName('');
      setConfig({});
    } catch (error) {
      console.error('Failed to connect account:', error);
      alert('Failed to connect account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfigChange = (key: string, value: string) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-[500px] max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">Connect New Account</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
            >
              <option value="NAVER_IMAP">Naver Mail (IMAP)</option>
              <option value="NOTION">Notion</option>
            </select>
          </div>

          <Input
            label="Account Name (Alias)"
            placeholder="e.g. My Personal Email"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          {type === 'NAVER_IMAP' && (
            <>
              <Input
                label="Email Address"
                type="email"
                placeholder="user@naver.com"
                value={config.username || ''}
                onChange={(e) => handleConfigChange('username', e.target.value)}
                required
              />
              <Input
                label="Password"
                type="password"
                placeholder="Naver Password"
                value={config.password || ''}
                onChange={(e) => handleConfigChange('password', e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="IMAP Host"
                  value={config.host || 'imap.naver.com'}
                  onChange={(e) => handleConfigChange('host', e.target.value)}
                />
                <Input
                  label="IMAP Port"
                  type="number"
                  value={config.port || '993'}
                  onChange={(e) => handleConfigChange('port', e.target.value)}
                />
              </div>
            </>
          )}

          {type === 'NOTION' && (
            <>
              <Input
                label="Integration Token"
                type="password"
                placeholder="secret_..."
                value={config.token || ''}
                onChange={(e) => handleConfigChange('token', e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Create an integration at <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Notion Developers</a>.
              </p>
            </>
          )}

          <div className="mt-6 flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Connecting...' : 'Connect Account'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
