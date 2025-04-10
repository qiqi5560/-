const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../database/models');

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: '该邮箱已被注册' });
    }

    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 创建新用户
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      lastLogin: new Date()
    });

    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 查找用户
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: '邮箱或密码不正确' });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: '邮箱或密码不正确' });
    }

    // 更新最后登录时间
    user.lastLogin = new Date();
    await user.save();

    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
  try {
    // 从请求头获取令牌
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ message: '无访问权限，请先登录' });
    }

    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查找用户
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpire'] }
    });

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '令牌无效或已过期' });
    }
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 忘记密码 - 发送重置邮件
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // 查找用户
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: '该邮箱未注册' });
    }

    // 生成重置令牌
    const resetToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 保存重置令牌和过期时间
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 3600000; // 1小时后过期
    await user.save();

    // 发送重置密码邮件
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
    const emailService = require('../services/emailService');
    await emailService.sendEmail(
      user.email,
      '重置密码',
      `请点击以下链接重置您的密码：${resetUrl}\n\n该链接将在1小时后失效。`,
      `<p>请点击以下链接重置您的密码：</p><p><a href="${resetUrl}">重置密码</a></p><p>该链接将在1小时后失效。</p>`
    );

    res.json({ success: true, message: '重置密码邮件已发送，请查收' });
  } catch (error) {
    console.error('发送重置密码邮件失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 重置密码
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 查找用户
    const user = await User.findOne({
      where: {
        id: decoded.id,
        resetPasswordToken: token,
        resetPasswordExpire: { [Op.gt]: Date.now() }
      }
    });

    if (!user) {
      return res.status(400).json({ message: '重置令牌无效或已过期' });
    }

    // 加密新密码
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.json({ success: true, message: '密码已重置，请使用新密码登录' });
  } catch (error) {
    console.error('重置密码失败:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: '重置令牌无效或已过期' });
    }
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 更新用户信息
router.put('/update', async (req, res) => {
  try {
    // 从请求头获取令牌
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ message: '无访问权限，请先登录' });
    }

    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查找用户
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 更新用户信息
    const { username, avatar } = req.body;
    if (username) user.username = username;
    if (avatar) user.avatar = avatar;
    
    await user.save();

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      },
      message: '用户信息已更新'
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '令牌无效或已过期' });
    }
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 更改密码
router.put('/change-password', async (req, res) => {
  try {
    // 从请求头获取令牌
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ message: '无访问权限，请先登录' });
    }

    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查找用户
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 验证当前密码
    const { currentPassword, newPassword } = req.body;
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: '当前密码不正确' });
    }

    // 更新密码
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: '密码已更新' });
  } catch (error) {
    console.error('更改密码失败:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '令牌无效或已过期' });
    }
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

module.exports = router;