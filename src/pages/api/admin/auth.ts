import type { NextApiRequest, NextApiResponse } from 'next';

// Admin credentials 
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123';

// Simple admin verification for API endpoints
export function verifyAdminAuth(req: NextApiRequest): { isValid: boolean; error?: string } {
  const { password } = req.body;
  
  if (!password) {
    return { isValid: false, error: 'Missing admin password' };
  }
  
  if (password !== ADMIN_PASSWORD) {
    return { isValid: false, error: 'Invalid admin password' };
  }
  
  return { isValid: true };
}

// No session loading needed for serverless environment

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, error: '密碼為必填項目' });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: '密碼錯誤' });
  }

  return res.status(200).json({
    success: true,
    message: '管理員登入成功'
  });
}

