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
      sameSite: 'lax',
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

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    
    // Clear the refresh token cookie
    res.clearCookie('refreshToken');
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Error during logout' });
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not found' });
    }
    
    const result = await authService.refreshToken(refreshToken);
    
    // Set new refresh token as HttpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: false,               // tylko na localhost
      sameSite: 'lax',             // 🟢 pozwala na POST z ciasteczkiem
      maxAge: 14 * 24 * 60 * 60 * 1000
    });
    
    res.json({
      accessToken: result.accessToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

const me = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userDetails = await authService.getUserDetails(req.user.id);

    
    res.json(userDetails);
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Error retrieving user details' });
  }
};

module.exports = { login, logout, refresh, me };