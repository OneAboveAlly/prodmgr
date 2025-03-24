const authService = require('../services/auth.service');

const login = async (req, res) => {
  try {
    const { login, password } = req.body;
    
    if (!login || !password) {
      return res.status(400).json({ message: 'Login and password are required' });
    }
    
    const result = await authService.login(login, password);
    
    // Ustawienie refresh tokena jako HttpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 14 * 24 * 60 * 60 * 1000 // 14 dni
    });
    
    res.json({
      user: result.user,
      accessToken: result.accessToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ message: error.message || 'Authentication failed' });
  }
};

module.exports = { login };