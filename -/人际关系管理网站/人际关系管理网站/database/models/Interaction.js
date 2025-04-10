const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Interaction = sequelize.define('Interaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    contactId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'contacts',
        key: 'id'
      },
      comment: '联系人ID'
    },
    type: {
      type: DataTypes.ENUM(
        'call',       // 通话
        'meeting',    // 见面
        'message',    // 消息
        'email',      // 邮件
        'gift',       // 礼物
        'activity',   // 活动
        'other'       // 其他
      ),
      defaultValue: 'other',
      comment: '互动类型'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '互动标题'
    },
    content: {
      type: DataTypes.TEXT,
      comment: '互动内容详情'
    },
    mood: {
      type: DataTypes.ENUM(
        'very_positive',  // 非常积极
        'positive',       // 积极
        'neutral',        // 中性
        'negative',       // 消极
        'very_negative'   // 非常消极
      ),
      defaultValue: 'neutral',
      comment: '互动情绪'
    },
    location: {
      type: DataTypes.STRING,
      comment: '互动地点'
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '互动日期时间'
    },
    duration: {
      type: DataTypes.INTEGER,
      comment: '互动持续时间(分钟)'
    },
    topics: {
      type: DataTypes.TEXT,
      comment: '谈话主题，多个主题用逗号分隔'
    },
    keyPoints: {
      type: DataTypes.TEXT,
      comment: '关键点，记录重要的谈话内容'
    },
    followUpRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否需要后续跟进'
    },
    followUpDate: {
      type: DataTypes.DATE,
      comment: '计划跟进日期'
    },
    followUpNotes: {
      type: DataTypes.TEXT,
      comment: '跟进备注'
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否私密记录'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'interactions',
    timestamps: true,
    indexes: [
      {
        fields: ['contactId']
      },
      {
        fields: ['date']
      },
      {
        fields: ['type']
      }
    ]
  });

  return Interaction;
};