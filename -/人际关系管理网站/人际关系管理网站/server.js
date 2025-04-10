const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { sequelize } = require('./database/models');
const scheduleReminders = require('./services/reminderService');

// 加载环境变量
dotenv.config();

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/interactions', require('./routes/interactions'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/network', require('./routes/network'));
app.use('/api/analytics', require('./routes/analytics'));

// 前端路由处理
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

// 启动服务器
async function startServer() {
  try {
    // 数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 启动定时任务
    scheduleReminders();
    
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
  }
}

startServer();