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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#0D0E12]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl w-[500px] max-h-[90vh] flex flex-col text-white">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-xl font-bold">Connect New Account</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 flex-1 overflow-y-auto">
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/80 mb-2">Account Type</label>
            <select
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#8A3FFC] focus:border-transparent transition-all duration-200"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
            >
              <option value="NAVER_IMAP" className="bg-[#0D0E12]">Naver Mail (IMAP)</option>
              <option value="NOTION" className="bg-[#0D0E12]">Notion</option>
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
              <p className="text-xs text-white/50 mt-1">
                Create an integration at <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" className="text-[#8A3FFC] hover:text-[#E02DFF] hover:underline transition-colors">Notion Developers</a>.
              </p>
            </>
          )}

          <div className="mt-8 flex justify-end space-x-3">
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
