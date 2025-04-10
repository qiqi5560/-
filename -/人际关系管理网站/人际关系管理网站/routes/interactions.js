const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Interaction, Contact } = require('../database/models');

// 中间件：验证用户身份
const authMiddleware = require('../middleware/auth');
router.use(authMiddleware);

// 获取所有互动记录（带分页和筛选）
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId, type, startDate, endDate, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    const where = {};
    
    // 如果指定了联系人ID，则筛选该联系人的互动
    if (contactId) {
      where.contactId = contactId;
    } else {
      // 否则，查询所有属于该用户的联系人的互动
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
    
    // 按日期范围筛选
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.date[Op.lte] = new Date(endDate);
      }
    }
    
    // 查询互动记录
    const interactions = await Interaction.findAndCountAll({
      where,
      include: [{
        model: Contact,
        where: { userId },
        attributes: ['id', 'name', 'nickname', 'avatar']
      }],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      count: interactions.count,
      pages: Math.ceil(interactions.count / limit),
      currentPage: parseInt(page),
      interactions: interactions.rows
    });
  } catch (error) {
    console.error('获取互动记录失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取单个互动记录详情
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const interactionId = req.params.id;
    
    const interaction = await Interaction.findOne({
      where: { id: interactionId },
      include: [{
        model: Contact,
        where: { userId },
        attributes: ['id', 'name', 'nickname', 'avatar', 'userId']
      }]
    });
    
    if (!interaction) {
      return res.status(404).json({ message: '互动记录不存在或无权访问' });
    }
    
    res.json({
      success: true,
      interaction
    });
  } catch (error) {
    console.error('获取互动记录详情失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 创建互动记录
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId, type, title, content, mood, location, date, duration, topics, keyPoints, followUpRequired, followUpDate, followUpNotes, isPrivate } = req.body;
    
    // 验证联系人归属
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在或无权访问' });
    }
    
    // 创建互动记录
    const interaction = await Interaction.create({
      contactId,
      type,
      title,
      content,
      mood,
      location,
      date: date || new Date(),
      duration,
      topics,
      keyPoints,
      followUpRequired,
      followUpDate,
      followUpNotes,
      isPrivate
    });
    
    // 更新联系人的最后联系时间
    await contact.update({ lastContactDate: new Date() });
    
    res.status(201).json({
      success: true,
      interaction
    });
  } catch (error) {
    console.error('创建互动记录失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 更新互动记录
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const interactionId = req.params.id;
    const updateData = req.body;
    
    // 查找互动记录
    const interaction = await Interaction.findOne({
      where: { id: interactionId },
      include: [{
        model: Contact,
        where: { userId },
        attributes: ['id']
      }]
    });
    
    if (!interaction) {
      return res.status(404).json({ message: '互动记录不存在或无权访问' });
    }
    
    // 更新互动记录
    await interaction.update(updateData);
    
    // 如果更新了跟进状态，可能需要更新联系人的最后联系时间
    if (updateData.followUpRequired === false && interaction.followUpRequired === true) {
      await Contact.update(
        { lastContactDate: new Date() },
        { where: { id: interaction.contactId } }
      );
    }
    
    res.json({
      success: true,
      interaction
    });
  } catch (error) {
    console.error('更新互动记录失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 删除互动记录
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const interactionId = req.params.id;
    
    // 查找互动记录
    const interaction = await Interaction.findOne({
      where: { id: interactionId },
      include: [{
        model: Contact,
        where: { userId },
        attributes: ['id']
      }]
    });
    
    if (!interaction) {
      return res.status(404).json({ message: '互动记录不存在或无权访问' });
    }
    
    // 删除互动记录
    await interaction.destroy();
    
    res.json({
      success: true,
      message: '互动记录已删除'
    });
  } catch (error) {
    console.error('删除互动记录失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取互动统计数据
router.get('/stats/overview', async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'month' } = req.query;
    
    // 获取用户的所有联系人ID
    const contacts = await Contact.findAll({
      where: { userId },
      attributes: ['id']
    });
    
    const contactIds = contacts.map(contact => contact.id);
    
    // 设置时间范围
    let startDate;
    const now = new Date();
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
    
    // 按类型统计互动次数
    const typeStats = await Interaction.findAll({
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        contactId: { [Op.in]: contactIds },
        date: { [Op.between]: [startDate, now] }
      },
      group: ['type']
    });
    
    // 按情绪统计互动次数
    const moodStats = await Interaction.findAll({
      attributes: [
        'mood',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        contactId: { [Op.in]: contactIds },
        date: { [Op.between]: [startDate, now] }
      },
      group: ['mood']
    });
    
    // 按日期统计互动次数（用于趋势图）
    const dateStats = await Interaction.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('date')), 'day'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        contactId: { [Op.in]: contactIds },
        date: { [Op.between]: [startDate, now] }
      },
      group: [sequelize.fn('DATE', sequelize.col('date'))],
      order: [[sequelize.fn('DATE', sequelize.col('date')), 'ASC']]
    });
    
    // 获取互动最多的联系人
    const topContacts = await Interaction.findAll({
      attributes: [
        'contactId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        contactId: { [Op.in]: contactIds },
        date: { [Op.between]: [startDate, now] }
      },
      group: ['contactId'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 5,
      include: [{
        model: Contact,
        attributes: ['name', 'nickname', 'avatar']
      }]
    });
    
    res.json({
      success: true,
      stats: {
        byType: typeStats,
        byMood: moodStats,
        byDate: dateStats,
        topContacts
      }
    });
  } catch (error) {
    console.error('获取互动统计数据失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

module.exports = router;