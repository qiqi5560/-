const jwt = require('jsonwebtoken');

// 验证用户身份的中间件
module.exports = (req, res, next) => {
  try {
    // 从请求头获取令牌
    const token = req.header('x-auth-token');
    
    // 检查是否有令牌
    if (!token) {
      return res.status(401).json({ message: '无访问权限，请先登录' });
    }
    
    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 将用户信息添加到请求对象
    req.user = decoded;
    
    // 继续执行下一个中间件或路由处理函数
    next();
  } catch (error) {
    console.error('身份验证失败:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '令牌无效或已过期' });
    }
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
};