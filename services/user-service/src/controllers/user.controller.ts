import { Request, Response } from 'express';
import pool from '../config/db';

export const createUserProfile = async (req: Request, res: Response) => {
  const { id, username, email, role } = req.body;

  if (!id || !username || !email) {
    return res.status(400).json({ message: 'Required fields missing (id, username, email).' });
  }

  try {
    const query = `
      INSERT INTO users (id, username, email, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await pool.query(query, [id, username, email, role ?? 'user']);
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1;', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { language_preference, theme_preference } = req.body;

  try {
    const query = `
      UPDATE users
      SET language_preference = COALESCE($1, language_preference),
          theme_preference = COALESCE($2, theme_preference),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;
    const result = await pool.query(query, [language_preference, theme_preference, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const deleteUserProfile = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *;', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({ message: 'Account deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const setBanStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { is_banned } = req.body;

  if (typeof is_banned !== 'boolean') {
    return res.status(400).json({ message: 'The is_banned field must be a boolean.' });
  }

  try {
    const query = `
      UPDATE users
      SET is_banned = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;
    const result = await pool.query(query, [is_banned, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ message: 'The role field is required.' });
  }

  try {
    const query = `
      UPDATE users
      SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;
    const result = await pool.query(query, [role, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};
