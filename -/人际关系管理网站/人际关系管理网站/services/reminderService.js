const schedule = require('node-schedule');
const moment = require('moment');
const { Op } = require('sequelize');
const axios = require('axios');
const { Reminder, Contact, User } = require('../database/models');
const emailService = require('./emailService');

// 农历日期转换函数（简化版，实际应使用专业库如lunar-calendar）
function isLunarDateToday(lunarDate) {
  // 这里应该使用专业的农历转换库
  // 简化实现，仅作示例
  return false;
}

// 检查并触发生日和纪念日提醒
async function checkDateReminders() {
  try {
    const today = moment().startOf('day');
    const tomorrow = moment().add(1, 'days').startOf('day');
    const nextWeek = moment().add(7, 'days').startOf('day');
    const nextMonth = moment().add(30, 'days').startOf('day');

    // 查找今天到未来30天内的提醒
    const upcomingReminders = await Reminder.findAll({
      where: {
        isActive: true,
        type: ['birthday', 'anniversary'],
        date: {
          [Op.between]: [today.toDate(), nextMonth.toDate()]
        }
      },
      include: [{
        model: Contact,
        include: [User]
      }]
    });

    // 处理农历日期提醒
    const lunarReminders = await Reminder.findAll({
      where: {
        isActive: true,
        isLunar: true,
        type: ['birthday', 'anniversary']
      },
      include: [{
        model: Contact,
        include: [User]
      }]
    });

    // 筛选今天是农历生日/纪念日的提醒
    const todayLunarReminders = lunarReminders.filter(reminder => {
      return isLunarDateToday(reminder.date);
    });

    // 合并需要处理的提醒
    const remindersToProcess = [...upcomingReminders, ...todayLunarReminders];

    // 处理每个提醒
    for (const reminder of remindersToProcess) {
      const reminderDate = moment(reminder.date);
      const daysUntil = reminderDate.diff(today, 'days');
      
      // 根据提前天数决定是否发送提醒
      if (daysUntil <= reminder.advanceNoticeDays) {
        // 发送提醒邮件
        await sendReminderEmail(reminder);
        
        // 更新提醒状态
        reminder.lastTriggered = new Date();
        
        // 如果是周期性提醒，计算下次提醒时间
        if (reminder.isRecurring) {
          reminder.nextTrigger = calculateNextTrigger(reminder);
        }
        
        await reminder.save();
      }
    }
  } catch (error) {
    console.error('处理日期提醒时出错:', error);
  }
}

// 检查周期性联系提醒
async function checkPeriodicReminders() {
  try {
    const now = new Date();
    
    // 查找所有到期的周期性提醒
    const dueReminders = await Reminder.findAll({
      where: {
        isActive: true,
        type: 'periodic',
        nextTrigger: {
          [Op.lte]: now
        }
      },
      include: [{
        model: Contact,
        include: [User]
      }]
    });
    
    // 处理每个到期提醒
    for (const reminder of dueReminders) {
      // 发送提醒邮件
      await sendReminderEmail(reminder);
      
      // 更新提醒状态
      reminder.lastTriggered = now;
      reminder.nextTrigger = calculateNextTrigger(reminder);
      await reminder.save();
    }
  } catch (error) {
    console.error('处理周期性提醒时出错:', error);
  }
}

// 检查天气异常提醒
async function checkWeatherAlerts() {
  try {
    // 获取所有启用了天气提醒的联系人
    const contacts = await Contact.findAll({
      where: {
        isActive: true,
        city: {
          [Op.not]: null
        }
      },
      include: [User]
    });
    
    // 按城市分组联系人
    const citiesMap = {};
    contacts.forEach(contact => {
      if (!citiesMap[contact.city]) {
        citiesMap[contact.city] = [];
      }
      citiesMap[contact.city].push(contact);
    });
    
    // 检查每个城市的天气
    for (const city in citiesMap) {
      try {
        const weatherData = await getWeatherData(city);
        
        // 检查是否有异常天气
        if (isExtremeWeather(weatherData)) {
          // 为该城市的每个联系人创建天气提醒
          for (const contact of citiesMap[city]) {
            await createWeatherReminder(contact, weatherData);
          }
        }
      } catch (weatherError) {
        console.error(`获取${city}天气数据时出错:`, weatherError);
      }
    }
  } catch (error) {
    console.error('处理天气提醒时出错:', error);
  }
}

// 获取天气数据
async function getWeatherData(city) {
  try {
    const response = await axios.get(`${process.env.WEATHER_API_URL}/current.json`, {
      params: {
        key: process.env.WEATHER_API_KEY,
        q: city,
        lang: 'zh'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`获取${city}天气数据失败:`, error);
    throw error;
  }
}

// 判断是否极端天气
function isExtremeWeather(weatherData) {
  // 简化判断逻辑，实际应用中应更复杂
  const temp = weatherData.current.temp_c;
  const condition = weatherData.current.condition.code;
  const isRaining = [1063, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(condition);
  const isSnowing = [1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(condition);
  const isExtremeCold = temp < 0;
  const isExtremeHot = temp > 35;
  
  return isRaining || isSnowing || isExtremeCold || isExtremeHot;
}

// 创建天气提醒
async function createWeatherReminder(contact, weatherData) {
  try {
    const weather = weatherData.current.condition.text;
    const temp = weatherData.current.temp_c;
    const city = contact.city;
    
    // 创建提醒
    await Reminder.create({
      contactId: contact.id,
      type: 'weather',
      title: `${city}天气异常提醒`,
      description: `${contact.name}所在的${city}目前天气${weather}，温度${temp}°C，建议发送问候。`,
      date: new Date(),
      isActive: true
    });
    
    // 发送提醒邮件给用户
    await emailService.sendEmail(
      contact.User.email,
      `${city}天气异常提醒`,
      `您的联系人${contact.name}所在的${city}目前天气${weather}，温度${temp}°C，建议发送问候。`
    );
  } catch (error) {
    console.error('创建天气提醒失败:', error);
  }
}

// 计算下一次触发时间
function calculateNextTrigger(reminder) {
  const now = moment();
  const pattern = reminder.recurringPattern;
  
  switch (pattern) {
    case 'daily':
      return now.add(1, 'day').toDate();
    case 'weekly':
      return now.add(1, 'week').toDate();
    case 'biweekly':
      return now.add(2, 'weeks').toDate();
    case 'monthly':
      return now.add(1, 'month').toDate();
    case 'quarterly':
      return now.add(3, 'months').toDate();
    case 'yearly':
      return now.add(1, 'year').toDate();
    default:
      // 如果是自定义cron表达式，使用node-schedule解析
      try {
        const nextDate = schedule.scheduleJob(pattern, () => {});
        nextDate.cancel();
        return nextDate.nextInvocation().toDate();
      } catch (error) {
        console.error('解析cron表达式失败:', error);
        return now.add(1, 'week').toDate(); // 默认一周后
      }
  }
}

// 发送提醒邮件
async function sendReminderEmail(reminder) {
  try {
    const contact = reminder.Contact;
    const user = contact.User;
    
    let subject = '';
    let content = '';
    
    switch (reminder.type) {
      case 'birthday':
        subject = `${contact.name}的生日提醒`;
        content = `您的${contact.relationship || '联系人'} ${contact.name} 将在 ${moment(reminder.date).format('YYYY-MM-DD')} 过生日，别忘了送上祝福！`;
        break;
      case 'anniversary':
        subject = `与${contact.name}的纪念日提醒`;
        content = `您与${contact.name}的${reminder.title}将在 ${moment(reminder.date).format('YYYY-MM-DD')} 到来，请记得庆祝！`;
        break;
      case 'periodic':
        subject = `定期联系${contact.name}的提醒`;
        content = `您已有 ${moment().diff(moment(contact.lastContactDate), 'days')} 天没有联系${contact.name}了，建议尽快联系。`;
        break;
      case 'promise':
        subject = `对${contact.name}的承诺提醒`;
        content = `您对${contact.name}的承诺「${reminder.title}」即将到期，请及时处理。`;
        break;
      default:
        subject = reminder.title;
        content = reminder.description;
    }
    
    // 发送邮件
    await emailService.sendEmail(user.email, subject, content);
    
    console.log(`已发送提醒邮件至 ${user.email}: ${subject}`);
  } catch (error) {
    console.error('发送提醒邮件失败:', error);
  }
}

// 设置定时任务
function scheduleReminders() {
  // 每天早上8点检查生日和纪念日提醒
  schedule.scheduleJob('0 8 * * *', checkDateReminders);
  
  // 每4小时检查一次周期性联系提醒
  schedule.scheduleJob('0 */4 * * *', checkPeriodicReminders);
  
  // 每天早上7点和下午6点检查天气提醒
  schedule.scheduleJob('0 7,18 * * *', checkWeatherAlerts);
  
  console.log('提醒服务已启动');
  
  // 立即执行一次检查
  checkDateReminders();
  checkPeriodicReminders();
  checkWeatherAlerts();
}

module.exports = scheduleReminders;