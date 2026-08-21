import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { findUser } from '../utils/eventAccess';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticateHost = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required. Missing token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'Authentication required. Missing token.' });
    return;
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ message: 'Invalid or expired token.' });
    return;
  }

  req.user = decoded;
  next();
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const user = await findUser(req.user?.userId);
  if (!user || user.role !== 'ADMIN') {
    res.status(403).json({ message: 'Forbidden: Admin access required.' });
    return;
  }
  next();
};
