const express = require('express');
const { Op, Sequelize } = require('sequelize');
const { Contact, Interaction, Reminder, Promise, LifeEvent } = require('../database/models');
const moment = require('moment');

// 中间件：验证用户身份
const authMiddleware = require('../middleware/auth');
router.use(authMiddleware);

// 获取联系人统计数据
router.get('/contacts', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 联系人总数
    try {
      const totalContacts = await Contact.count({
        where: { userId }
      });
    } catch (error) {
      console.error('获取联系人统计数据失败:', error);
      res.status(500).json({ message: '服务器错误，请稍后再试' });
    }
    
    // 最近30天新增联系人
    const newContacts = await Contact.count({
      where: {
        userId,
        createdAt: {
          [Op.gte]: moment().subtract(30, 'days').toDate()
        }
      }
    });
    
    // 最近联系的联系人（最近7天有互动）
    const recentlyContacted = await Contact.count({
      where: {
        userId,
        lastContactDate: {
          [Op.gte]: moment().subtract(7, 'days').toDate()
        }
      }
    });
    
    // 长期未联系的联系人（超过30天未联系）
    const notContactedRecently = await Contact.count({
      where: {
        userId,
        [Op.or]: [
          {
            lastContactDate: {
              [Op.lt]: moment().subtract(30, 'days').toDate()
            }
          },
          { lastContactDate: null }
        ]
      }
    });
    
    // 按重要性分组
    const importanceGroups = await Contact.findAll({
      attributes: [
        'importance',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: { userId },
      group: ['importance'],
      order: [['importance', 'DESC']]
    });
    
    res.json({
      success: true,
      stats: {
        totalContacts,
        newContacts,
        recentlyContacted,
        notContactedRecently,
        byImportance: importanceGroups.map(group => ({
          importance: group.importance || 0,
          count: parseInt(group.getDataValue('count'))
        }))
      }
    });
  } catch (error) {
    console.error('获取联系人统计数据失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取互动统计数据
router.get('/interactions', async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'month' } = req.query; // 'week', 'month', 'year'
    
    // 获取用户的所有联系人ID
    const contacts = await Contact.findAll({
      where: { userId },
      attributes: ['id']
    });
    
    const contactIds = contacts.map(contact => contact.id);
    
    // 设置时间范围
    let startDate;
    let groupFormat;
    
    switch (period) {
      case 'week':
        startDate = moment().subtract(7, 'days').startOf('day');
        groupFormat = 'YYYY-MM-DD';
        break;
      case 'year':
        startDate = moment().subtract(1, 'year').startOf('day');
        groupFormat = 'YYYY-MM';
        break;
      case 'month':
      default:
        startDate = moment().subtract(30, 'days').startOf('day');
        groupFormat = 'YYYY-MM-DD';
        break;
    }
    
    // 按日期分组的互动数量
    const interactionsByDate = await Interaction.findAll({
      attributes: [
        [Sequelize.fn('DATE_FORMAT', Sequelize.col('date'), groupFormat), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        contactId: { [Op.in]: contactIds },
        date: { [Op.gte]: startDate.toDate() }
      },
      group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('date'), groupFormat)],
      order: [[Sequelize.col('date'), 'ASC']]
    });
    
    // 按类型分组的互动数量
    const interactionsByType = await Interaction.findAll({
      attributes: [
        'type',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        contactId: { [Op.in]: contactIds },
        date: { [Op.gte]: startDate.toDate() }
      },
      group: ['type'],
      order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']]
    });
    
    // 互动最多的联系人
    const topContacts = await Interaction.findAll({
      attributes: [
        'contactId',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        contactId: { [Op.in]: contactIds },
        date: { [Op.gte]: startDate.toDate() }
      },
      group: ['contactId'],
      order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']],
      limit: 5,
      include: [{
        model: Contact,
        attributes: ['name', 'nickname', 'avatar']
      }]
    });
    
    res.json({
      success: true,
      stats: {
        byDate: interactionsByDate.map(item => ({
          date: item.getDataValue('date'),
          count: parseInt(item.getDataValue('count'))
        })),
        byType: interactionsByType.map(item => ({
          type: item.type,
          count: parseInt(item.getDataValue('count'))
        })),
        topContacts: topContacts.map(item => ({
          contactId: item.contactId,
          name: item.Contact.nickname || item.Contact.name,
          avatar: item.Contact.avatar,
          count: parseInt(item.getDataValue('count'))
        }))
      }
    });
  } catch (error) {
    console.error('获取互动统计数据失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取提醒统计数据
router.get('/reminders', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取用户的所有联系人ID
    const contacts = await Contact.findAll({
      where: { userId },
      attributes: ['id']
    });
    
    const contactIds = contacts.map(contact => contact.id);
    
    // 活跃提醒总数
    const totalActiveReminders = await Reminder.count({
      where: {
        contactId: { [Op.in]: contactIds },
        isActive: true
      }
    });
    
    // 未来30天内的提醒
    const upcomingReminders = await Reminder.count({
      where: {
        contactId: { [Op.in]: contactIds },
        isActive: true,
        [Op.or]: [
          {
            date: {
              [Op.between]: [
                moment().startOf('day').toDate(),
                moment().add(30, 'days').endOf('day').toDate()
              ]
            }
          },
          {
            nextTrigger: {
              [Op.between]: [
                moment().startOf('day').toDate(),
                moment().add(30, 'days').endOf('day').toDate()
              ]
            }
          }
        ]
      }
    });
    
    // 按类型分组的提醒
    const remindersByType = await Reminder.findAll({
      attributes: [
        'type',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        contactId: { [Op.in]: contactIds },
        isActive: true
      },
      group: ['type'],
      order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']]
    });
    
    // 周期性提醒数量
    const recurringReminders = await Reminder.count({
      where: {
        contactId: { [Op.in]: contactIds },
        isActive: true,
        isRecurring: true
      }
    });
    
    res.json({
      success: true,
      stats: {
        totalActiveReminders,
        upcomingReminders,
        recurringReminders,
        byType: remindersByType.map(item => ({
          type: item.type,
          count: parseInt(item.getDataValue('count'))
        }))
      }
    });
  } catch (error) {
    console.error('获取提醒统计数据失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取承诺统计数据
router.get('/promises', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取用户的所有联系人ID
    const contacts = await Contact.findAll({
      where: { userId },
      attributes: ['id']
    });
    
    const contactIds = contacts.map(contact => contact.id);
    
    // 按状态分组的承诺
    const promisesByStatus = await Promise.findAll({
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        contactId: { [Op.in]: contactIds }
      },
      group: ['status']
    });
    
    // 即将到期的承诺（7天内）
    const upcomingDeadlines = await Promise.count({
      where: {
        contactId: { [Op.in]: contactIds },
        status: { [Op.ne]: 'completed' },
        dueDate: {
          [Op.between]: [
            moment().startOf('day').toDate(),
            moment().add(7, 'days').endOf('day').toDate()
          ]
        }
      }
    });
    
    // 已逾期的承诺
    const overduePromises = await Promise.count({
      where: {
        contactId: { [Op.in]: contactIds },
        status: { [Op.ne]: 'completed' },
        dueDate: {
          [Op.lt]: moment().startOf('day').toDate()
        }
      }
    });
    
    res.json({
      success: true,
      stats: {
        byStatus: promisesByStatus.map(item => ({
          status: item.status,
          count: parseInt(item.getDataValue('count'))
        })),
        upcomingDeadlines,
        overduePromises
      }
    });
  } catch (error) {
    console.error('获取承诺统计数据失败:', error);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取用户活跃度数据
router.get('/activity', async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = 'month' } = req.query; // 'week', 'month', 'year'

        // 获取用户的所有联系人ID
        const contacts = await Contact.findAll({
            where: { userId },
            attributes: ['id']
        });

        const contactIds = contacts.map(contact => contact.id);

        // 设置时间范围
        let startDate;
        let groupFormat;

        switch (period) {
            case 'week':
                startDate = moment().subtract(7, 'days').startOf('day');
                groupFormat = 'YYYY-MM-DD';
                break;
            case 'year':
                startDate = moment().subtract(1, 'year').startOf('day');
                groupFormat = 'YYYY-MM';
                break;
            case 'month':
            default:
                startDate = moment().subtract(30, 'days').startOf('day');
                groupFormat = 'YYYY-MM-DD';
                break;
        }

        // 按日期统计互动、提醒和承诺的创建数量
        const activityData = {};

        // 互动数据
        const interactionActivity = await Interaction.findAll({
            attributes: [
                [Sequelize.fn('DATE_FORMAT', Sequelize.col('date'), groupFormat), 'date'],
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            where: {
                contactId: { [Op.in]: contactIds },
                date: { [Op.gte]: startDate.toDate() }
            },
            group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('date'), groupFormat)],
            order: [[Sequelize.col('date'), 'ASC']]
        });

        // 提醒数据
        const reminderActivity = await Reminder.findAll({
            attributes: [
                [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), groupFormat), 'date'],
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            where: {
                contactId: { [Op.in]: contactIds },
                createdAt: { [Op.gte]: startDate.toDate() }
            },
            group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), groupFormat)],
            order: [[Sequelize.col('date'), 'ASC']]
        });

        // 承诺数据
        const promiseActivity = await Promise.findAll({
            attributes: [
                [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), groupFormat), 'date'],
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            where: {
                contactId: { [Op.in]: contactIds },
                createdAt: { [Op.gte]: startDate.toDate() }
            },
            group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), groupFormat)],
            order: [[Sequelize.col('date'), 'ASC']]
        });

        // 生命事件数据
        const lifeEventActivity = await LifeEvent.findAll({
            attributes: [
                [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), groupFormat), 'date'],
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            where: {
                contactId: { [Op.in]: contactIds },
                createdAt: { [Op.gte]: startDate.toDate() }
            },
            group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), groupFormat)],
            order: [[Sequelize.col('date'), 'ASC']]
        });

        // 合并所有日期
        const allDates = new Set();

        interactionActivity.forEach(item => allDates.add(item.getDataValue('date')));
        reminderActivity.forEach(item => allDates.add(item.getDataValue('date')));
        promiseActivity.forEach(item => allDates.add(item.getDataValue('date')));
        lifeEventActivity.forEach(item => allDates.add(item.getDataValue('date')));

        // 按日期排序
        const sortedDates = Array.from(allDates).sort();

        // 构建活跃度数据
        const activityByDate = sortedDates.map(date => {
            const interactionCount = interactionActivity.find(item => item.getDataValue('date') === date);
            const reminderCount = reminderActivity.find(item => item.getDataValue('date') === date);
            const promiseCount = promiseActivity.find(item => item.getDataValue('date') === date);
            const lifeEventCount = lifeEventActivity.find(item => item.getDataValue('date') === date);

            return {
                date,
                interaction: interactionCount ? parseInt(interactionCount.getDataValue('count')) : 0,
                reminder: reminderCount ? parseInt(reminderCount.getDataValue('count')) : 0,
                promise: promiseCount ? parseInt(promiseCount.getDataValue('count')) : 0,
                lifeEvent: lifeEventCount ? parseInt(lifeEventCount.getDataValue('count')) : 0
            };
        });

        res.json({
            success: true,
            stats: {
                activityByDate
            }
        });