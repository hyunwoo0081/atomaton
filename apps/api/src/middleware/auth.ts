import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      isDeveloper?: boolean;
    }
  }
}

interface JwtPayload {
  userId: string;
  isDeveloper: boolean;
}

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ message: 'Authentication token required' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded) return res.status(403).json({ message: 'Invalid or expired token' });

    const user = decoded as JwtPayload;
    req.userId = user.userId;
    req.isDeveloper = user.isDeveloper;
    next();
  });
};

export const authorizeDeveloper = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isDeveloper) {
    return res.status(403).json({ message: 'Developer access required' });
  }
  next();
};
