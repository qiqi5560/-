const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: '+08:00', // 设置为中国时区
  }
);

// 导入模型
const User = require('./User')(sequelize);
const Contact = require('./Contact')(sequelize);
const Interaction = require('./Interaction')(sequelize);
const Reminder = require('./Reminder')(sequelize);
const Promise = require('./Promise')(sequelize);
const Tag = require('./Tag')(sequelize);
const ContactTag = require('./ContactTag')(sequelize);
const LifeEvent = require('./LifeEvent')(sequelize);
const Interest = require('./Interest')(sequelize);
const Taboo = require('./Taboo')(sequelize);
const Relationship = require('./Relationship')(sequelize);

// 定义关联关系
User.hasMany(Contact, { foreignKey: 'userId', onDelete: 'CASCADE' });
Contact.belongsTo(User, { foreignKey: 'userId' });

Contact.hasMany(Interaction, { foreignKey: 'contactId', onDelete: 'CASCADE' });
Interaction.belongsTo(Contact, { foreignKey: 'contactId' });

Contact.hasMany(Reminder, { foreignKey: 'contactId', onDelete: 'CASCADE' });
Reminder.belongsTo(Contact, { foreignKey: 'contactId' });

Contact.hasMany(Promise, { foreignKey: 'contactId', onDelete: 'CASCADE' });
Promise.belongsTo(Contact, { foreignKey: 'contactId' });

Contact.hasMany(LifeEvent, { foreignKey: 'contactId', onDelete: 'CASCADE' });
LifeEvent.belongsTo(Contact, { foreignKey: 'contactId' });

Contact.hasMany(Interest, { foreignKey: 'contactId', onDelete: 'CASCADE' });
Interest.belongsTo(Contact, { foreignKey: 'contactId' });

Contact.hasMany(Taboo, { foreignKey: 'contactId', onDelete: 'CASCADE' });
Taboo.belongsTo(Contact, { foreignKey: 'contactId' });

Contact.belongsToMany(Tag, { through: ContactTag, foreignKey: 'contactId' });
Tag.belongsToMany(Contact, { through: ContactTag, foreignKey: 'tagId' });

Contact.belongsToMany(Contact, {
  through: Relationship,
  as: 'connections',
  foreignKey: 'contactId',
  otherKey: 'relatedContactId'
});

module.exports = {
  sequelize,
  User,
  Contact,
  Interaction,
  Reminder,
  Promise,
  Tag,
  ContactTag,
  LifeEvent,
  Interest,
  Taboo,
  Relationship
};