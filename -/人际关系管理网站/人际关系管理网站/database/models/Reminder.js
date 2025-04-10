const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reminder = sequelize.define('Reminder', {
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
      }
    },
    type: {
      type: DataTypes.ENUM('birthday', 'anniversary', 'periodic', 'promise', 'weather', 'custom'),
      defaultValue: 'custom'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    isLunar: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否农历日期'
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否重复提醒'
    },
    recurringPattern: {
      type: DataTypes.STRING,
      comment: '重复模式，如yearly, monthly, weekly, daily或自定义cron表达式'
    },
    advanceNoticeDays: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: '提前提醒天数'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastTriggered: {
      type: DataTypes.DATE,
      comment: '上次触发时间'
    },
    nextTrigger: {
      type: DataTypes.DATE,
      comment: '下次触发时间'
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
    tableName: 'reminders',
    timestamps: true
  });

  return Reminder;
};