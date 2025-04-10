const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Contact, Relationship } = require('../database/models');

// 中间件：验证用户身份
const authMiddleware = require('../middleware/auth');
router.use(authMiddleware);

// 获取用户的关系网络
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取用户的所有联系人
    const contacts = await Contact.findAll({
      where: { userId },
      attributes: ['id', 'name', 'nickname', 'avatar', 'importance']
    });
    
    // 获取所有联系人之间的关系
    const contactIds = contacts.map(contact => contact.id);
    const relationships = await Relationship.findAll({
      where: {
        [Op.or]: [
          { contactId: { [Op.in]: contactIds } },
          { relatedContactId: { [Op.in]: contactIds } }
        ]
      },
      include: [
        {
          model: Contact,
          as: 'contact',
          attributes: ['id', 'name', 'nickname', 'avatar']
        },
        {
          model: Contact,
          as: 'relatedContact',
          attributes: ['id', 'name', 'nickname', 'avatar']
        }
      ]
    });
    
    // 构建网络图数据
    const nodes = contacts.map(contact => ({
      id: contact.id,
      name: contact.nickname || contact.name,
      avatar: contact.avatar,
      importance: contact.importance || 1
    }));
    
    const links = relationships.map(rel => ({
      source: rel.contactId,
      target: rel.relatedContactId,
      type: rel.relationshipType,
      strength: rel.strength || 1
    }));
    
    res.json({
      success: true,
      network: {
        nodes,
        links
      }
    });
  } catch (error) {
    console.error('获取关系网络失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 创建联系人之间的关系
router.post('/relationship', async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId, relatedContactId, relationshipType, description, strength } = req.body;
    
    // 验证两个联系人是否都属于当前用户
    const contact1 = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    const contact2 = await Contact.findOne({
      where: { id: relatedContactId, userId }
    });
    
    if (!contact1 || !contact2) {
      return res.status(404).json({ message: '联系人不存在或无权访问' });
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
      return res.status(400).json({ message: '这两个联系人之间的关系已存在' });
    }
    
    // 创建关系
    const relationship = await Relationship.create({
      contactId,
      relatedContactId,
      relationshipType,
      description,
      strength: strength || 1
    });
    
    res.status(201).json({
      success: true,
      relationship
    });
  } catch (error) {
    console.error('创建关系失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 更新联系人之间的关系
router.put('/relationship/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const relationshipId = req.params.id;
    const updateData = req.body;
    
    // 查找关系
    const relationship = await Relationship.findByPk(relationshipId, {
      include: [
        {
          model: Contact,
          as: 'contact',
          where: { userId },
          attributes: ['id']
        },
        {
          model: Contact,
          as: 'relatedContact',
          where: { userId },
          attributes: ['id']
        }
      ]
    });
    
    if (!relationship) {
      return res.status(404).json({ message: '关系不存在或无权访问' });
    }
    
    // 更新关系
    await relationship.update(updateData);
    
    res.json({
      success: true,
      relationship
    });
  } catch (error) {
    console.error('更新关系失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 删除联系人之间的关系
router.delete('/relationship/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const relationshipId = req.params.id;
    
    // 查找关系
    const relationship = await Relationship.findByPk(relationshipId, {
      include: [
        {
          model: Contact,
          as: 'contact',
          where: { userId },
          attributes: ['id']
        },
        {
          model: Contact,
          as: 'relatedContact',
          where: { userId },
          attributes: ['id']
        }
      ]
    });
    
    if (!relationship) {
      return res.status(404).json({ message: '关系不存在或无权访问' });
    }
    
    // 删除关系
    await relationship.destroy();
    
    res.json({
      success: true,
      message: '关系已删除'
    });
  } catch (error) {
    console.error('删除关系失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取特定联系人的关系网络
router.get('/contact/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    
    // 验证联系人归属
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在或无权访问' });
    }
    
    // 获取与该联系人直接相关的所有关系
    const relationships = await Relationship.findAll({
      where: {
        [Op.or]: [
          { contactId },
          { relatedContactId: contactId }
        ]
      },
      include: [
        {
          model: Contact,
          as: 'contact',
          attributes: ['id', 'name', 'nickname', 'avatar', 'importance']
        },
        {
          model: Contact,
          as: 'relatedContact',
          attributes: ['id', 'name', 'nickname', 'avatar', 'importance']
        }
      ]
    });
    
    // 收集所有相关联系人的ID
    const relatedContactIds = new Set();
    relationships.forEach(rel => {
      if (rel.contactId === parseInt(contactId)) {
        relatedContactIds.add(rel.relatedContactId);
      } else {
        relatedContactIds.add(rel.contactId);
      }
    });
    
    // 构建网络图数据
    const nodes = [
      {
        id: contact.id,
        name: contact.nickname || contact.name,
        avatar: contact.avatar,
        importance: contact.importance || 1,
        isCentral: true
      }
    ];
    
    const links = [];
    
    // 添加相关联系人节点和连接
    relationships.forEach(rel => {
      const isSource = rel.contactId === parseInt(contactId);
      const relatedContact = isSource ? rel.relatedContact : rel.contact;
      
      // 添加节点（如果尚未添加）
      if (!nodes.some(node => node.id === relatedContact.id)) {
        nodes.push({
          id: relatedContact.id,
          name: relatedContact.nickname || relatedContact.name,
          avatar: relatedContact.avatar,
          importance: relatedContact.importance || 1,
          isCentral: false
        });
      }
      
      // 添加连接
      links.push({
        source: isSource ? contact.id : relatedContact.id,
        target: isSource ? relatedContact.id : contact.id,
        type: rel.relationshipType,
        strength: rel.strength || 1,
        description: rel.description
      });
    });
    
    res.json({
      success: true,
      network: {
        nodes,
        links
      }
    });
  } catch (error) {
    console.error('获取联系人关系网络失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

module.exports = router;