const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ContactTag = sequelize.define('ContactTag', {
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
    tagId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tags',
        key: 'id'
      }
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
    tableName: 'contact_tags',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['contactId', 'tagId']
      }
    ]
  });

  return ContactTag;
};