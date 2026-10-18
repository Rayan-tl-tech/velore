import authService from '../services/authService.js';

const registerUser = async (req, res) => {
  try {
    const result = await authService.registerUser(req.body);
    const user = result.user || result;
    const token = result.token;
    res.status(201).json({ message: 'User registered successfully', user, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { user, token } = await authService.loginUser(req.body);
    res.status(200).json({ message: 'User logged in successfully', token, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export { registerUser, loginUser };

