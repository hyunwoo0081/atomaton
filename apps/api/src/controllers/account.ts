import { Request, Response } from 'express';
import prisma, { Prisma } from '@atomaton/db';
import { encrypt } from '@atomaton/db/crypto';
import { startImapPolling, stopImapPolling } from '../services/imapPolling';

interface ImapCredentials {
  username: string;
  password?: string;
  host?: string;
  port?: number;
  pollingIntervalMin?: number;
}

export const createAccount = async (req: Request, res: Response) => {
  const { type, config } = req.body as { type: string; config: ImapCredentials };
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (!type || !config) {
    return res.status(400).json({ message: 'Account type and configuration are required' });
  }

  if (type === 'NAVER_IMAP' && config.password) {
    config.password = encrypt(config.password);
  }

  try {
    const account = await prisma.account.create({
      data: {
        userId,
        type,
        credentials: config as unknown as Prisma.InputJsonValue,
      },
    });
    res.status(201).json(account);
  } catch (error: unknown) {
    console.error('Error creating account:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAccounts = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const accounts = await prisma.account.findMany({ where: { userId } });
    const safeAccounts = accounts.map(account => {
      const credentials = account.credentials as unknown as ImapCredentials;
      if (account.type === 'NAVER_IMAP' && credentials.password) {
        credentials.password = 'ENCRYPTED';
      }
      return { ...account, credentials };
    });
    res.status(200).json(safeAccounts);
  } catch (error: unknown) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAccountById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const account = await prisma.account.findUnique({ where: { id, userId } });
    if (!account) return res.status(404).json({ message: 'Account not found' });

    const credentials = account.credentials as unknown as ImapCredentials;
    if (account.type === 'NAVER_IMAP' && credentials.password) {
      credentials.password = 'ENCRYPTED';
    }
    res.status(200).json({ ...account, credentials });
  } catch (error: unknown) {
    console.error('Error fetching account:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { type, config } = req.body as { type?: string; config?: ImapCredentials };
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  if (type === 'NAVER_IMAP' && config && config.password) {
    config.password = encrypt(config.password);
  }

  try {
    const account = await prisma.account.update({
      where: { id, userId },
      data: { type, credentials: config as unknown as Prisma.InputJsonValue },
    });

    if (account.type === 'NAVER_IMAP' && config && config.pollingIntervalMin) {
      stopImapPolling(account.id);
      startImapPolling(account.id, config.pollingIntervalMin);
    }
    res.status(200).json(account);
  } catch (error: unknown) {
    console.error('Error updating account:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    await prisma.account.delete({ where: { id, userId } });
    stopImapPolling(id);
    res.status(204).send();
  } catch (error: unknown) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
