const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// 创建数据库连接
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: console.log,
  }
);

// 导入所有模型
const models = require('./models');

// 同步数据库
async function initDatabase() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 同步所有模型到数据库
    await sequelize.sync({ force: true });
    console.log('数据库表结构已创建');

    // 创建系统默认标签
    await createDefaultTags();

    console.log('数据库初始化完成');
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

// 创建系统默认标签
async function createDefaultTags() {
  const { Tag } = require('./models');
  
  // 系统默认用户ID（管理员）
  const systemUserId = 1;
  
  // 关系类型标签
  const relationshipTags = [
    { name: '家人', color: '#FF5733', type: 'relationship', isSystem: true },
    { name: '朋友', color: '#33FF57', type: 'relationship', isSystem: true },
    { name: '同事', color: '#3357FF', type: 'relationship', isSystem: true },
    { name: '同学', color: '#F3FF33', type: 'relationship', isSystem: true },
    { name: '商业伙伴', color: '#FF33F3', type: 'relationship', isSystem: true },
  ];
  
  // 群组标签
  const groupTags = [
    { name: '大学', color: '#33FFF3', type: 'group', isSystem: true },
    { name: '高中', color: '#F333FF', type: 'group', isSystem: true },
    { name: '公司', color: '#FF3333', type: 'group', isSystem: true },
    { name: '俱乐部', color: '#33FF33', type: 'group', isSystem: true },
  ];
  
  // 地区标签
  const locationTags = [
    { name: '北京', color: '#3333FF', type: 'location', isSystem: true },
    { name: '上海', color: '#FFFF33', type: 'location', isSystem: true },
    { name: '广州', color: '#FF33FF', type: 'location', isSystem: true },
    { name: '深圳', color: '#33FFFF', type: 'location', isSystem: true },
  ];
  
  // 合并所有标签
  const allTags = [...relationshipTags, ...groupTags, ...locationTags];
  
  // 为每个标签添加用户ID
  const tagsWithUserId = allTags.map(tag => ({
    ...tag,
    userId: systemUserId,
    description: `系统默认${tag.name}标签`
  }));
  
  // 批量创建标签
  await Tag.bulkCreate(tagsWithUserId);
  console.log('系统默认标签已创建');
}

// 执行初始化
initDatabase();