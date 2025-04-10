/**
 * API接口封装
 */
const API = {
  // 基础URL
  baseURL: '/api',
  
  // 通用请求方法
  async request(endpoint, method = 'GET', data = null, headers = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // 添加认证令牌
    const token = localStorage.getItem('token');
    if (token) {
      headers['x-auth-token'] = token;
    }
    
    // 设置内容类型
    if (!headers['Content-Type'] && method !== 'GET' && method !== 'DELETE') {
      headers['Content-Type'] = 'application/json';
    }
    
    // 请求配置
    const config = {
      method,
      headers,
      credentials: 'same-origin'
    };
    
    // 添加请求体
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url, config);
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || '请求失败');
      }
      
      return responseData;
    } catch (error) {
      console.error(`API请求失败: ${url}`, error);
      throw error;
    }
  },
  
  // 认证相关API
  auth: {
    // 用户注册
    register(userData) {
      return API.request('/auth/register', 'POST', userData);
    },
    
    // 用户登录
    login(credentials) {
      return API.request('/auth/login', 'POST', credentials);
    },
    
    // 获取当前用户信息
    getCurrentUser() {
      return API.request('/auth/me');
    },
    
    // 忘记密码
    forgotPassword(email) {
      return API.request('/auth/forgot-password', 'POST', { email });
    },
    
    // 重置密码
    resetPassword(token, password) {
      return API.request(`/auth/reset-password/${token}`, 'POST', { password });
    },
    
    // 更新用户信息
    updateProfile(userData) {
      return API.request('/auth/profile', 'PUT', userData);
    },
    
    // 更改密码
    changePassword(passwordData) {
      return API.request('/auth/change-password', 'PUT', passwordData);
    }
  },
  
  // 联系人相关API
  contacts: {
    // 获取所有联系人
    getAll(params = {}) {
      const queryString = new URLSearchParams(params).toString();
      return API.request(`/contacts?${queryString}`);
    },
    
    // 获取单个联系人详情
    getById(id) {
      return API.request(`/contacts/${id}`);
    },
    
    // 创建联系人
    create(contactData) {
      return API.request('/contacts', 'POST', contactData);
    },
    
    // 更新联系人
    update(id, contactData) {
      return API.request(`/contacts/${id}`, 'PUT', contactData);
    },
    
    // 删除联系人
    delete(id) {
      return API.request(`/contacts/${id}`, 'DELETE');
    },
    
    // 获取联系人标签
    getTags() {
      return API.request('/contacts/tags');
    },
    
    // 创建标签
    createTag(tagData) {
      return API.request('/contacts/tags', 'POST', tagData);
    },
    
    // 添加兴趣爱好
    addInterest(contactId, interestData) {
      return API.request(`/contacts/${contactId}/interests`, 'POST', interestData);
    },
    
    // 删除兴趣爱好
    deleteInterest(contactId, interestId) {
      return API.request(`/contacts/${contactId}/interests/${interestId}`, 'DELETE');
    },
    
    // 添加禁忌话题
    addTaboo(contactId, tabooData) {
      return API.request(`/contacts/${contactId}/taboos`, 'POST', tabooData);
    },
    
    // 删除禁忌话题
    deleteTaboo(contactId, tabooId) {
      return API.request(`/contacts/${contactId}/taboos/${tabooId}`, 'DELETE');
    },
    
    // 添加生命事件
    addLifeEvent(contactId, eventData) {
      return API.request(`/contacts/${contactId}/life-events`, 'POST', eventData);
    },
    
    // 更新生命事件
    updateLifeEvent(contactId, eventId, eventData) {
      return API.request(`/contacts/${contactId}/life-events/${eventId}`, 'PUT', eventData);
    },
    
    // 删除生命事件
    deleteLifeEvent(contactId, eventId) {
      return API.request(`/contacts/${contactId}/life-events/${eventId}`, 'DELETE');
    }
  },
  
  // 互动记录相关API
  interactions: {
    // 获取所有互动记录
    getAll(params = {}) {
      const queryString = new URLSearchParams(params).toString();
      return API.request(`/interactions?${queryString}`);
    },
    
    // 获取单个互动记录详情
    getById(id) {
      return API.request(`/interactions/${id}`);
    },
    
    // 创建互动记录
    create(interactionData) {
      return API.request('/interactions', 'POST', interactionData);
    },
    
    // 更新互动记录
    update(id, interactionData) {
      return API.request(`/interactions/${id}`, 'PUT', interactionData);
    },
    
    // 删除互动记录
    delete(id) {
      return API.request(`/interactions/${id}`, 'DELETE');
    },
    
    // 获取最近互动
    getRecent(contactId, limit = 5) {
      return API.request(`/interactions/recent/${contactId}?limit=${limit}`);
    }
  },
  
  // 提醒相关API
  reminders: {
    // 获取所有提醒
    getAll(params = {}) {
      const queryString = new URLSearchParams(params).toString();
      return API.request(`/reminders?${queryString}`);
    },
    
    // 获取单个提醒详情
    getById(id) {
      return API.request(`/reminders/${id}`);
    },
    
    // 创建提醒
    create(reminderData) {
      return API.request('/reminders', 'POST', reminderData);
    },
    
    // 更新提醒
    update(id, reminderData) {
      return API.request(`/reminders/${id}`, 'PUT', reminderData);
    },
    
    // 删除提醒
    delete(id) {
      return API.request(`/reminders/${id}`, 'DELETE');
    },
    
    // 获取今日提醒
    getToday() {
      return API.request('/reminders/today');
    },
    
    // 获取即将到来的提醒
    getUpcoming(days = 30) {
      return API.request(`/reminders/upcoming?days=${days}`);
    },
    
    // 标记提醒为已完成
    markAsCompleted(id) {
      return API.request(`/reminders/${id}/complete`, 'PUT');
    },
    
    // 重新激活提醒
    reactivate(id) {
      return API.request(`/reminders/${id}/reactivate`, 'PUT');
    }
  },
  
  // 承诺相关API
  promises: {
    // 获取所有承诺
    getAll(params = {}) {
      const queryString = new URLSearchParams(params).toString();
      return API.request(`/contacts/promises?${queryString}`);
    },
    
    // 获取单个承诺详情
    getById(contactId, promiseId) {
      return API.request(`/contacts/${contactId}/promises/${promiseId}`);
    },
    
    // 创建承诺
    create(contactId, promiseData) {
      return API.request(`/contacts/${contactId}/promises`, 'POST', promiseData);
    },
    
    // 更新承诺
    update(contactId, promiseId, promiseData) {
      return API.request(`/contacts/${contactId}/promises/${promiseId}`, 'PUT', promiseData);
    },
    
    // 删除承诺
    delete(contactId, promiseId) {
      return API.request(`/contacts/${contactId}/promises/${promiseId}`, 'DELETE');
    },
    
    // 完成承诺
    complete(contactId, promiseId) {
      return API.request(`/contacts/${contactId}/promises/${promiseId}/complete`, 'PUT');
    }
  },
  
  // 关系网络相关API
  network: {
    // 获取用户的关系网络
    getAll() {
      return API.request('/network');
    },
    
    // 获取特定联系人的关系网络
    getForContact(contactId) {
      return API.request(`/network/contact/${contactId}`);
    },
    
    // 创建联系人之间的关系
    createRelationship(relationshipData) {
      return API.request('/network/relationship', 'POST', relationshipData);
    },
    
    // 更新联系人之间的关系
    updateRelationship(relationshipId, relationshipData) {
      return API.request(`/network/relationship/${relationshipId}`, 'PUT', relationshipData);
    },
    
    // 删除联系人之间的关系
    deleteRelationship(relationshipId) {
      return API.request(`/network/relationship/${relationshipId}`, 'DELETE');
    }
  },
  
  // 数据分析相关API
  analytics: {
    // 获取联系人统计数据
    getContactStats() {
      return API.request('/analytics/contacts');
    },
    
    // 获取互动统计数据
    getInteractionStats(period = 'month') {
      return API.request(`/analytics/interactions?period=${period}`);
    },
    
    // 获取提醒统计数据
    getReminderStats() {
      return API.request('/analytics/reminders');
    },
    
    // 获取承诺统计数据
    getPromiseStats() {
      return API.request('/analytics/promises');
    },
    
    // 获取用户活跃度数据
    getActivityStats(period = 'month') {
      return API.request(`/analytics/activity?period=${period}`);
    }
  }
};