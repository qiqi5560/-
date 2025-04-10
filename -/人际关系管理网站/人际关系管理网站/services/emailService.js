const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// 创建邮件发送器
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * 发送邮件
 * @param {string} to - 收件人邮箱
 * @param {string} subject - 邮件主题
 * @param {string} text - 邮件文本内容
 * @param {string} html - 邮件HTML内容（可选）
 * @returns {Promise} - 发送结果
 */
async function sendEmail(to, subject, text, html) {
  try {
    const mailOptions = {
      from: `"人际关系管理系统" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text
    };

    // 如果提供了HTML内容，则添加到邮件选项中
    if (html) {
      mailOptions.html = html;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`邮件已发送: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('发送邮件失败:', error);
    throw error;
  }
}

module.exports = {
  sendEmail
};