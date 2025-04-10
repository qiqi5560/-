const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tag = sequelize.define('Tag', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '标签所属用户ID'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '标签名称'
    },
    color: {
      type: DataTypes.STRING,
      defaultValue: '#3498db',
      comment: '标签颜色（十六进制）'
    },
    description: {
      type: DataTypes.STRING,
      comment: '标签描述'
    },
    type: {
      type: DataTypes.ENUM('relationship', 'group', 'location', 'custom'),
      defaultValue: 'custom',
      comment: '标签类型'
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否系统标签'
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
    tableName: 'tags',
    timestamps: true
  });

  return Tag;
};