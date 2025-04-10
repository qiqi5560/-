const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Contact = sequelize.define('Contact', {
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
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    nickname: {
      type: DataTypes.STRING
    },
    avatar: {
      type: DataTypes.STRING,
      defaultValue: 'default-contact.png'
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      defaultValue: 'other'
    },
    birthday: {
      type: DataTypes.DATEONLY
    },
    isLunarBirthday: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否农历生日'
    },
    phone: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true
      }
    },
    address: {
      type: DataTypes.STRING
    },
    city: {
      type: DataTypes.STRING
    },
    province: {
      type: DataTypes.STRING
    },
    country: {
      type: DataTypes.STRING,
      defaultValue: '中国'
    },
    company: {
      type: DataTypes.STRING
    },
    position: {
      type: DataTypes.STRING
    },
    relationship: {
      type: DataTypes.STRING,
      comment: '与联系人的关系，如朋友、同事、家人等'
    },
    relationshipLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      comment: '关系亲密度，1-5，5为最亲密'
    },
    meetingPlace: {
      type: DataTypes.STRING,
      comment: '相识地点'
    },
    meetingTime: {
      type: DataTypes.DATEONLY,
      comment: '相识时间'
    },
    notes: {
      type: DataTypes.TEXT,
      comment: '备注信息'
    },
    lastContactDate: {
      type: DataTypes.DATE,
      comment: '上次联系时间'
    },
    contactFrequency: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      comment: '建议联系频率（天）'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否活跃联系人'
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
    tableName: 'contacts',
    timestamps: true
  });

  return Contact;
};