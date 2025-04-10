const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Promise = sequelize.define('Promise', {
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
      comment: '承诺标题'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '承诺详细描述'
    },
    dueDate: {
      type: DataTypes.DATE,
      comment: '承诺截止日期'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      defaultValue: 'medium',
      comment: '优先级'
    },
    status: {
      type: DataTypes.ENUM(
        'pending',    // 待处理
        'in_progress', // 进行中
        'completed',  // 已完成
        'overdue',    // 已逾期
        'cancelled'   // 已取消
      ),
      defaultValue: 'pending',
      comment: '承诺状态'
    },
    reminderDate: {
      type: DataTypes.DATE,
      comment: '提醒日期'
    },
    completedDate: {
      type: DataTypes.DATE,
      comment: '完成日期'
    },
    notes: {
      type: DataTypes.TEXT,
      comment: '备注'
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否周期性承诺'
    },
    recurringPattern: {
      type: DataTypes.STRING,
      comment: '周期模式'
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
    tableName: 'promises',
    timestamps: true,
    indexes: [
      {
        fields: ['contactId']
      },
      {
        fields: ['dueDate']
      },
      {
        fields: ['status']
      }
    ]
  });

  return Promise;
};