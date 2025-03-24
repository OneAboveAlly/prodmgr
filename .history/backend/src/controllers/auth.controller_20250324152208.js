const authService = require('../services/auth.service');

const login = async (req, res) => {
  try {
    const { login, password } = req.body;
    
    if (!login || !password) {
      return res.status(400).json({ message: 'Login and password are required' });
    }
    
    const result = await authService.login(login, password);
    
    // Ustawienie refresh tokena jako HttpOnly cookie z poprawnymi opcjami CORS
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none', // Zmienione z 'lax' na 'none' dla cross-origin
      path: '/',
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
    
    // Clear the refresh token cookie z poprawnymi opcjami
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      path: '/'
    });
    
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
      return res.status(401).json({ message: 'Refresh token not found in cookies' });
    }

    console.log('Otrzymano refresh token:', refreshToken.slice(0, 20) + '...');
    
    const result = await authService.refreshToken(refreshToken);
    
    // Set new refresh token as HttpOnly cookie z poprawnymi opcjami CORS
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none', // Zmienione z 'lax' na 'none' dla cross-origin
      path: '/',
      maxAge: 14 * 24 * 60 * 60 * 1000
    });
    
    res.json({
      accessToken: result.accessToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    // Bardziej szczegółowe komunikaty błędów dla debugowania
    let errorMessage = 'Invalid or expired refresh token';
    
    if (error.name === 'JsonWebTokenError') {
      errorMessage = 'JWT token invalid: ' + error.message;
    } else if (error.name === 'TokenExpiredError') {
      errorMessage = 'JWT token expired';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(401).json({ message: errorMessage });
  }
};

const me = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userDetails = await authService.getUserDetails(req.user.userId);
    
    res.json(userDetails);
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Error retrieving user details' });
  }
};

module.exports = { login, logout, refresh, me };