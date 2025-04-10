const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Reminder, Contact } = require('../database/models');
const moment = require('moment');

// 中间件：验证用户身份
const authMiddleware = require('../middleware/auth');
router.use(authMiddleware);

// 获取所有提醒
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId, type, isActive, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    const where = {};
    
    // 如果指定了联系人ID，则筛选该联系人的提醒
    if (contactId) {
      where.contactId = contactId;
    } else {
      // 否则，查询所有属于该用户的联系人的提醒
      const contacts = await Contact.findAll({
        where: { userId },
        attributes: ['id']
      });
      
      const contactIds = contacts.map(contact => contact.id);
      where.contactId = { [Op.in]: contactIds };
    }
    
    // 按类型筛选
    if (type) {
      where.type = type;
    }
    
    // 按状态筛选
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    // 查询提醒
    const reminders = await Reminder.findAndCountAll({
      where,
      include: [{
        model: Contact,
        where: { userId },
        attributes: ['id', 'name', 'nickname', 'avatar']
      }],
      order: [['date', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      count: reminders.count,
      pages: Math.ceil(reminders.count / limit),
      currentPage: parseInt(page),
      reminders: reminders.rows
    });
  } catch (error) {
    console.error('获取提醒列表失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取单个提醒详情
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const reminderId = req.params.id;
    
    const reminder = await Reminder.findOne({
      where: { id: reminderId },
      include: [{
        model: Contact,
        where: { userId },
        attributes: ['id', 'name', 'nickname', 'avatar', 'userId']
      }]
    });
    
    if (!reminder) {
      return res.status(404).json({ message: '提醒不存在或无权访问' });
    }
    
    res.json({
      success: true,
      reminder
    });
  } catch (error) {
    console.error('获取提醒详情失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 创建提醒
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId, type, title, description, date, isLunar, isRecurring, recurringPattern, advanceNoticeDays } = req.body;
    
    // 验证联系人归属
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在或无权访问' });
    }
    
    // 创建提醒
    const reminder = await Reminder.create({
      contactId,
      type,
      title,
      description,
      date: new Date(date),
      isLunar: isLunar || false,
      isRecurring: isRecurring || false,
      recurringPattern,
      advanceNoticeDays: advanceNoticeDays || 1,
      isActive: true,
      nextTrigger: isRecurring ? calculateNextTrigger({ recurringPattern, date }) : null
    });
    
    res.status(201).json({
      success: true,
      reminder
    });
  } catch (error) {
    console.error('创建提醒失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 更新提醒
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const reminderId = req.params.id;
    const updateData = req.body;
    
    // 查找提醒
    const reminder = await Reminder.findOne({
      where: { id: reminderId },
      include: [{
        model: Contact,
        where: { userId },
        attributes: ['id']
      }]
    });
    
    if (!reminder) {
      return res.status(404).json({ message: '提醒不存在或无权访问' });
    }
    
    // 如果更新了周期设置，重新计算下次触发时间
    if (updateData.isRecurring !== undefined || updateData.recurringPattern || updateData.date) {
      const isRecurring = updateData.isRecurring !== undefined ? updateData.isRecurring : reminder.isRecurring;
      const recurringPattern = updateData.recurringPattern || reminder.recurringPattern;
      const date = updateData.date ? new Date(updateData.date) : reminder.date;
      
      if (isRecurring) {
        updateData.nextTrigger = calculateNextTrigger({ recurringPattern, date });
      } else {
        updateData.nextTrigger = null;
      }
    }
    
    // 更新提醒
    await reminder.update(updateData);
    
    res.json({
      success: true,
      reminder
    });
  } catch (error) {
    console.error('更新提醒失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 删除提醒
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const reminderId = req.params.id;
    
    // 查找提醒
    const reminder = await Reminder.findOne({
      where: { id: reminderId },
      include: [{
        model: Contact,
        where: { userId },
        attributes: ['id']
      }]
    });
    
    if (!reminder) {
      return res.status(404).json({ message: '提醒不存在或无权访问' });
    }
    
    // 删除提醒
    await reminder.destroy();
    
    res.json({
      success: true,
      message: '提醒已删除'
    });
  } catch (error) {
    console.error('删除提醒失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取即将到来的提醒
router.get('/upcoming/all', async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    
    // 获取用户的所有联系人ID
    const contacts = await Contact.findAll({
      where: { userId },
      attributes: ['id']
    });
    
    const contactIds = contacts.map(contact => contact.id);
    
    // 设置时间范围
    const today = moment().startOf('day');
    const endDate = moment().add(parseInt(days), 'days').endOf('day');
    
    // 查询即将到来的提醒
    const upcomingReminders = await Reminder.findAll({
      where: {
        contactId: { [Op.in]: contactIds },
        isActive: true,
        [Op.or]: [
          {
            date: { [Op.between]: [today.toDate(), endDate.toDate()] }
          },
          {
            nextTrigger: { [Op.between]: [today.toDate(), endDate.toDate()] }
          }
        ]
      },
      include: [{
        model: Contact,
        attributes: ['id', 'name', 'nickname', 'avatar']
      }],
      order: [['date', 'ASC']]
    });
    
    res.json({
      success: true,
      reminders: upcomingReminders
    });
  } catch (error) {
    console.error('获取即将到来的提醒失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取今日提醒
router.get('/today/all', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取用户的所有联系人ID
    const contacts = await Contact.findAll({
      where: { userId },
      attributes: ['id']
    });
    
    const contactIds = contacts.map(contact => contact.id);
    
    // 设置时间范围
    const today = moment().startOf('day');
    const tomorrow = moment().add(1, 'days').startOf('day');
    
    // 查询今日提醒
    const todayReminders = await Reminder.findAll({
      where: {
        contactId: { [Op.in]: contactIds },
        isActive: true,
        [Op.or]: [
          {
            date: { [Op.between]: [today.toDate(), tomorrow.toDate()] }
          },
          {
            nextTrigger: { [Op.between]: [today.toDate(), tomorrow.toDate()] }
          }
        ]
      },
      include: [{
        model: Contact,
        attributes: ['id', 'name', 'nickname', 'avatar']
      }],
      order: [['date', 'ASC']]
    });
    
    res.json({
      success: true,
      reminders: todayReminders
    });
  } catch (error) {
    console.error('获取今日提醒失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 辅助函数：计算下一次触发时间
function calculateNextTrigger({ recurringPattern, date }) {
  const now = moment();
  const reminderDate = moment(date);
  
  switch (recurringPattern) {
    case 'daily':
      return now.add(1, 'day').toDate();
    case 'weekly':
      return now.add(1, 'week').toDate();
    case 'biweekly':
      return now.add(2, 'weeks').toDate();
    case 'monthly':
      return now.add(1, 'month').toDate();
    case 'quarterly':
      return now.add(3, 'months').toDate();
    case 'yearly':
      return now.add(1, 'year').toDate();
    default:
      // 默认一周后
      return now.add(1, 'week').toDate();
  }
}

module.exports = router;