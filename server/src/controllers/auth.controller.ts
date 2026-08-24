import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { AuthRequest } from '../middleware/auth.middleware';
import { findUser } from '../utils/eventAccess';
import { logActivity } from '../utils/logger';

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email, and password are required.' });
      return;
    }

    const requester = await findUser(req.user?.userId);
    if (!requester || requester.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden: Only admins can create hosts.' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists.' });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'HOST',
      },
    });

    res.status(201).json({
      message: 'Host created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    const userCount = await prisma.user.count();
    if (userCount === 0) {
      // Convenience for local setup only. In production the same branch would let
      // whoever reaches the empty deployment first claim ADMIN, so it is closed and
      // ensureBootstrapAdmin (awaited before the port opens) is the only way in.
      if (process.env.NODE_ENV === 'production') {
        res.status(503).json({
          message: 'No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD and restart the server.',
        });
        return;
      }

      const user = await prisma.user.create({
        data: {
          name: 'Admin',
          email,
          password: await hashPassword(password),
          role: 'ADMIN',
        },
      });
      const token = generateToken(user.id, user.email);
      await logActivity(user.id, 'LOGIN', 'User', user.id, { email: user.email, bootstrap: true });
      res.status(200).json({
        message: 'First admin created',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    const token = generateToken(user.id, user.email);

    await logActivity(user.id, 'LOGIN', 'User', user.id, { email: user.email });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export async function ensureBootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  await prisma.user.create({
    data: {
      name: 'Admin',
      email,
      password: await hashPassword(password),
      role: 'ADMIN',
    },
  });
  console.log(`Bootstrap admin created for ${email}`);
}
