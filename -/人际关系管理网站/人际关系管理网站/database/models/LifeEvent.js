const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LifeEvent = sequelize.define('LifeEvent', {
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
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '事件标题'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '事件详细描述'
    },
    date: {
      type: DataTypes.DATEONLY,
      comment: '事件日期'
    },
    type: {
      type: DataTypes.ENUM(
        'education',    // 教育经历
        'career',       // 职业发展
        'relationship', // 人际关系
        'family',       // 家庭事件
        'achievement',  // 成就
        'health',       // 健康相关
        'relocation',   // 搬迁/迁移
        'other'         // 其他
      ),
      defaultValue: 'other',
      comment: '事件类型'
    },
    importance: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      comment: '重要性，1-5，5为最重要'
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否私密记录'
    },
    location: {
      type: DataTypes.STRING,
      comment: '事件发生地点'
    },
    relatedPeople: {
      type: DataTypes.TEXT,
      comment: '相关人员，可以是多个人名，用逗号分隔'
    },
    notes: {
      type: DataTypes.TEXT,
      comment: '备注'
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
    tableName: 'life_events',
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

  return LifeEvent;
};