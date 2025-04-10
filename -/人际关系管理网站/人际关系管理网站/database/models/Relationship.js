const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Relationship = sequelize.define('Relationship', {
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
    relatedContactId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'contacts',
        key: 'id'
      },
      comment: '相关联系人ID'
    },
    relationshipType: {
      type: DataTypes.ENUM(
        'family', // 家人
        'friend', // 朋友
        'colleague', // 同事
        'classmate', // 同学
        'business', // 商业关系
        'acquaintance', // 熟人
        'other' // 其他
      ),
      defaultValue: 'acquaintance',
      comment: '关系类型'
    },
    specificRelation: {
      type: DataTypes.STRING,
      comment: '具体关系描述，如"大学室友"、"前同事"'
    },
    strength: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      comment: '关系强度，1-5，5为最强'
    },
    startDate: {
      type: DataTypes.DATEONLY,
      comment: '关系开始日期'
    },
    notes: {
      type: DataTypes.TEXT,
      comment: '关系备注'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '关系是否活跃'
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
    tableName: 'relationships',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['contactId', 'relatedContactId']
      }
    ]
  });

  return Relationship;
};