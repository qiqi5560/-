const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Contact, Tag, ContactTag, Interaction, Reminder, Promise, LifeEvent, Interest, Taboo, Relationship } = require('../database/models');

// 中间件：验证用户身份
const authMiddleware = require('../middleware/auth');
router.use(authMiddleware);

// 获取所有联系人
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 查询参数
    const { search, tag, sort, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    const where = { userId };
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { nickname: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // 排序方式
    let order = [];
    if (sort === 'recent') {
      order = [['lastContactDate', 'DESC']];
    } else if (sort === 'name') {
      order = [['name', 'ASC']];
    } else {
      order = [['createdAt', 'DESC']];
    }
    
    // 查询联系人
    const query = {
      where,
      order,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: Tag,
        through: ContactTag,
        as: 'tags'
      }]
    };
    
    // 如果按标签筛选
    if (tag) {
      query.include[0].where = { id: tag };
    }
    
    const contacts = await Contact.findAndCountAll(query);
    
    res.json({
      success: true,
      count: contacts.count,
      pages: Math.ceil(contacts.count / limit),
      currentPage: parseInt(page),
      contacts: contacts.rows
    });
  } catch (error) {
    console.error('获取联系人列表失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取单个联系人详情
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    
    const contact = await Contact.findOne({
      where: { id: contactId, userId },
      include: [
        {
          model: Tag,
          through: ContactTag,
          as: 'tags'
        },
        {
          model: Interaction,
          limit: 5,
          order: [['date', 'DESC']]
        },
        {
          model: Reminder,
          where: { isActive: true },
          required: false
        },
        {
          model: Promise,
          where: { status: { [Op.ne]: 'completed' } },
          required: false
        },
        {
          model: LifeEvent,
          order: [['date', 'DESC']],
          required: false
        },
        {
          model: Interest,
          required: false
        },
        {
          model: Taboo,
          required: false
        }
      ]
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }
    
    // 获取关系网络
    const relationships = await Relationship.findAll({
      where: {
        [Op.or]: [
          { contactId },
          { relatedContactId: contactId }
        ]
      },
      include: [{
        model: Contact,
        as: 'contact'
      }, {
        model: Contact,
        as: 'relatedContact'
      }]
    });
    
    res.json({
      success: true,
      contact,
      relationships
    });
  } catch (error) {
    console.error('获取联系人详情失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 创建新联系人
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactData = req.body;
    
    // 提取标签数据
    const { tags, ...contactInfo } = contactData;
    
    // 创建联系人
    const contact = await Contact.create({
      ...contactInfo,
      userId,
      lastContactDate: new Date()
    });
    
    // 如果有标签，添加关联
    if (tags && tags.length > 0) {
      const tagIds = tags.map(tag => tag.id);
      await contact.addTags(tagIds);
    }
    
    // 返回创建的联系人（包含标签）
    const newContact = await Contact.findByPk(contact.id, {
      include: [{
        model: Tag,
        through: ContactTag,
        as: 'tags'
      }]
    });
    
    res.status(201).json({
      success: true,
      contact: newContact
    });
  } catch (error) {
    console.error('创建联系人失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 更新联系人
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    const contactData = req.body;
    
    // 提取标签数据
    const { tags, ...contactInfo } = contactData;
    
    // 查找联系人
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }
    
    // 更新联系人信息
    await contact.update(contactInfo);
    
    // 如果有标签，更新关联
    if (tags) {
      const tagIds = tags.map(tag => tag.id);
      await contact.setTags(tagIds);
    }
    
    // 返回更新后的联系人（包含标签）
    const updatedContact = await Contact.findByPk(contact.id, {
      include: [{
        model: Tag,
        through: ContactTag,
        as: 'tags'
      }]
    });
    
    res.json({
      success: true,
      contact: updatedContact
    });
  } catch (error) {
    console.error('更新联系人失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 删除联系人
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }
    
    await contact.destroy();
    
    res.json({
      success: true,
      message: '联系人已删除'
    });
  } catch (error) {
    console.error('删除联系人失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取联系人的互动历史
router.get('/:id/interactions', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // 验证联系人归属
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }
    
    // 获取互动记录
    const interactions = await Interaction.findAndCountAll({
      where: { contactId },
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
    console.error('获取互动历史失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 添加互动记录
router.post('/:id/interactions', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    const interactionData = req.body;
    
    // 验证联系人归属
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }
    
    // 创建互动记录
    const interaction = await Interaction.create({
      ...interactionData,
      contactId
    });
    
    // 更新联系人的最后联系时间
    await contact.update({ lastContactDate: new Date() });
    
    res.status(201).json({
      success: true,
      interaction
    });
  } catch (error) {
    console.error('添加互动记录失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取联系人的提醒
router.get('/:id/reminders', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    
    // 验证联系人归属
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }
    
    // 获取提醒
    const reminders = await Reminder.findAll({
      where: { contactId },
      order: [['date', 'ASC']]
    });
    
    res.json({
      success: true,
      reminders
    });
  } catch (error) {
    console.error('获取提醒失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 添加提醒
router.post('/:id/reminders', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    const reminderData = req.body;
    
    // 验证联系人归属
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }
    
    // 创建提醒
    const reminder = await Reminder.create({
      ...reminderData,
      contactId,
      isActive: true
    });
    
    res.status(201).json({
      success: true,
      reminder
    });
  } catch (error) {
    console.error('添加提醒失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取联系人的承诺
router.get('/:id/promises', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    
    // 验证联系人归属
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }
    
    // 获取承诺
    const promises = await Promise.findAll({
      where: { contactId },
      order: [['dueDate', 'ASC']]
    });
    
    res.json({
      success: true,
      promises
    });
  } catch (error) {
    console.error('获取承诺失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 添加承诺
router.post('/:id/promises', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    const promiseData = req.body;
    
    // 验证联系人归属
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }
    
    // 创建承诺
    const promise = await Promise.create({
      ...promiseData,
      contactId,
      status: 'pending'
    });
    
    res.status(201).json({
      success: true,
      promise
    });
  } catch (error) {
    console.error('添加承诺失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 更新承诺状态
router.put('/:contactId/promises/:promiseId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId, promiseId } = req.params;
    const { status } = req.body;
    
    // 验证联系人归属
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }
    
    // 查找并更新承诺
    const promise = await Promise.findOne({
      where: { id: promiseId, contactId }
    });
    
    if (!promise) {
      return res.status(404).json({ message: '承诺不存在' });
    }
    
    // 更新状态
    await promise.update({
      status,
      completedDate: status === 'completed' ? new Date() : null
    });
    
    res.json({
      success: true,
      promise
    });
  } catch (error) {
    console.error('更新承诺状态失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取联系人的生活事件
router.get('/:id/life-events', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    
    // 验证联系人归属
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }
    
    // 获取生活事件
    const lifeEvents = await LifeEvent.findAll({
      where: { contactId },
      order: [['date', 'DESC']]
    });
    
    res.json({
      success: true,
      lifeEvents
    });
  } catch (error) {
    console.error('获取生活事件失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 添加生活事件
router.post('/:id/life-events', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    const eventData = req.body;
    
    // 验证联系人归属
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }
    
    // 创建生活事件
    const lifeEvent = await LifeEvent.create({
      ...eventData,
      contactId
    });
    
    res.status(201).json({
      success: true,
      lifeEvent
    });
  } catch (error) {
    console.error('添加生活事件失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取联系人的兴趣爱好
router.get('/:id/interests', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    
    // 验证联系人归属
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }
    
    // 获取兴趣爱好
    const interests = await Interest.findAll({
      where: { contactId },
      order: [['level', 'DESC']]
    });
    
    res.json({
      success: true,
      interests
    });
  } catch (error) {
    console.error('获取兴趣爱好失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 添加兴趣爱好
router.post('/:id/interests', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    const interestData = req.body;
    
    // 验证联系人归属
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }
    
    // 创建兴趣爱好
    const interest = await Interest.create({
      ...interestData,
      contactId
    });
    
    res.status(201).json({
      success: true,
      interest
    });
  } catch (error) {
    console.error('添加兴趣爱好失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取联系人的禁忌话题
router.get('/:id/taboos', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    
    // 验证联系人归属
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }
    
    // 获取禁忌话题
    const taboos = await Taboo.findAll({
      where: { contactId },
      order: [['severity', 'DESC']]
    });
    
    res.json({
      success: true,
      taboos
    });
  } catch (error) {
    console.error('获取禁忌话题失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 添加禁忌话题
router.post('/:id/taboos', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    const tabooData = req.body;
    
    // 验证联系人归属
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }
    
    // 创建禁忌话题
    const taboo = await Taboo.create({
      ...tabooData,
      contactId
    });
    
    res.status(201).json({
      success: true,
      taboo
    });
  } catch (error) {
    console.error('添加禁忌话题失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 添加关系连接
router.post('/:id/relationships', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    const { relatedContactId, relationshipType, specificRelation, strength } = req.body;
    
    // 验证两个联系人都属于当前用户
    const contacts = await Contact.findAll({
      where: {
        userId,
        id: { [Op.in]: [contactId, relatedContactId] }
      }
    });
    
    if (contacts.length !== 2) {
      return res.status(404).json({ message: '联系人不存在或不属于当前用户' });
    }
    
    // 检查关系是否已存在
    const existingRelationship = await Relationship.findOne({
      where: {
        [Op.or]: [
          { contactId, relatedContactId },
          { contactId: relatedContactId, relatedContactId: contactId }
        ]
      }
    });
    
    if (existingRelationship) {
      return res.status(400).json({ message: '关系已存在' });
    }
    
    // 创建关系
    const relationship = await Relationship.create({
      contactId,
      relatedContactId,
      relationshipType,
      specificRelation,
      strength,
      startDate: new Date()
    });
    
    res.status(201).json({
      success: true,
      relationship
    });
  } catch (error) {
    console.error('添加关系连接失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

module.exports = router;