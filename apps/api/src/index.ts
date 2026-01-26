import 'dotenv/config';
import express, { Request, Response } from 'express';
import authRouter from './routes/auth';
import workflowRouter from './routes/workflow';
import accountRouter from './routes/account';
import webhookRouter from './routes/webhook';
import adminRouter from './routes/admin';
import logRouter from './routes/log';
import { authenticateToken } from './middleware/auth';
import { setProcessor } from './executors/queue';
import { executeWorkflow } from './executors/executor';
import { cleanupOldLogs } from './services/logCleanup';
import { WorkflowContext } from './executors/types';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Atomaton API is running!');
});

app.use('/auth', authRouter);
app.use('/workflows', workflowRouter);
app.use('/accounts', accountRouter);
app.use('/webhook', webhookRouter);
app.use('/admin', adminRouter);
app.use('/logs', logRouter);

app.get('/protected', authenticateToken, (req: Request, res: Response) => {
  res.json({ message: `Welcome ${req.userId}! You are ${req.isDeveloper ? 'a developer' : 'a regular user'}.` });
});

// Wrapper function for queue processing
const queueProcessorWrapper = async (context: WorkflowContext): Promise<void> => {
  // Call executeWorkflow without override data, and ignore its return value
  await executeWorkflow(context);
};

// Set the workflow executor as the queue processor
setProcessor(queueProcessorWrapper);

// Schedule log cleanup job to run once every 24 hours
const oneDayInMs = 24 * 60 * 60 * 1000;
setInterval(cleanupOldLogs, oneDayInMs);
cleanupOldLogs(); // Run once on startup

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
