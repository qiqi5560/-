const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Interest = sequelize.define('Interest', {
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
    category: {
      type: DataTypes.ENUM(
        'hobby',       // 爱好
        'food',        // 食物
        'movie',       // 电影
        'music',       // 音乐
        'book',        // 书籍
        'sport',       // 运动
        'travel',      // 旅行
        'art',         // 艺术
        'technology',  // 科技
        'other'        // 其他
      ),
      defaultValue: 'hobby',
      comment: '兴趣类别'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '兴趣名称'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '详细描述'
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      comment: '兴趣程度，1-5，5为最高'
    },
    source: {
      type: DataTypes.STRING,
      comment: '信息来源，如何得知该兴趣'
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
    tableName: 'interests',
    timestamps: true,
    indexes: [
      {
        fields: ['contactId']
      },
      {
        fields: ['category']
      }
    ]
  });

  return Interest;
};