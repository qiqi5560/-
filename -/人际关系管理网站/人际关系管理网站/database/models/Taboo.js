const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Taboo = sequelize.define('Taboo', {
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
    topic: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '禁忌话题'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '详细描述'
    },
    severity: {
      type: DataTypes.ENUM('mild', 'moderate', 'severe'),
      defaultValue: 'moderate',
      comment: '严重程度'
    },
    reason: {
      type: DataTypes.TEXT,
      comment: '禁忌原因'
    },
    discoveryDate: {
      type: DataTypes.DATEONLY,
      comment: '发现日期'
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
    tableName: 'taboos',
    timestamps: true,
    indexes: [
      {
        fields: ['contactId']
      }
    ]
  });

  return Taboo;
};