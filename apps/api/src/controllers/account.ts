import { Request, Response } from 'express';
import prisma from '@atomaton/db';
import { encrypt, decrypt } from '@atomaton/db/crypto';
import { startImapPolling, stopImapPolling } from '../services/imapPolling';

export const createAccount = async (req: Request, res: Response) => {
  const { type, config } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (!type || !config) {
    return res.status(400).json({ message: 'Account type and configuration are required' });
  }

  // Encrypt IMAP password if type is NAVER_IMAP
  if (type === 'NAVER_IMAP' && config.password) {
    config.password = encrypt(config.password);
  }

  try {
    const account = await prisma.account.create({
      data: {
        userId,
        type,
        credentials: config,
      },
    });
    res.status(201).json(account);
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAccounts = async (req: Request, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const accounts = await prisma.account.findMany({
      where: { userId },
    });
    // For security, do not return decrypted passwords
    res.status(200).json(accounts.map(account => {
      const credentials = account.credentials as any;
      if (account.type === 'NAVER_IMAP' && credentials.password) {
        // Optionally, remove password field or indicate it's encrypted
        credentials.password = 'ENCRYPTED';
      }
      return { ...account, credentials };
    }));
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAccountById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const account = await prisma.account.findUnique({
      where: { id, userId },
    });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const credentials = account.credentials as any;
    if (account.type === 'NAVER_IMAP' && credentials.password) {
      credentials.password = 'ENCRYPTED';
    }

    res.status(200).json({ ...account, credentials });
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { type, config } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Encrypt IMAP password if type is NAVER_IMAP and password is provided
  if (type === 'NAVER_IMAP' && config && config.password) {
    config.password = encrypt(config.password);
  }

  try {
    const account = await prisma.account.update({
      where: { id, userId },
      data: { type, credentials: config },
    });

    // If IMAP account and polling is active, restart it with updated config
    if (account.type === 'NAVER_IMAP' && config && config.pollingIntervalMin) {
      // Need to adjust startImapPolling signature to accept config directly or fetch it internally
      // For now, assuming config.pollingIntervalMin is available and IMAP details can be re-fetched
      stopImapPolling(account.id); // Stop existing polling
      startImapPolling(account.id, config.pollingIntervalMin); // Start with new interval
    }

    res.status(200).json(account);
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await prisma.account.delete({
      where: { id, userId },
    });
    // Stop any active polling for this account
    stopImapPolling(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
