import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email, and password are required.' });
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
      },
    });

    const token = generateToken(user.id, user.email);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
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

    // Hardcoded credentials for Admin/Host as requested
    if (email === 'admin@admin.com' && password === 'admin') {
      let userId = 'admin-host-id';
      let userName = 'Admin Host';

      try {
        // Ensure this user exists in DB so foreign keys work (like for events)
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          const hashedPassword = await hashPassword(password);
          user = await prisma.user.create({
            data: {
              name: userName,
              email,
              password: hashedPassword,
            },
          });
        }
        userId = user.id;
        userName = user.name;
      } catch (dbErr) {
        console.warn('Database lookup failed during admin login, using fallback admin identity:', dbErr);
      }

      const token = generateToken(userId, email);

      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: userId,
          name: userName,
          email: email,
        },
      });
      return;
    }

    res.status(401).json({ message: 'Invalid credentials. Please use the hardcoded admin credentials.' });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: error?.message || 'Internal server error', details: String(error) });
  }
};
