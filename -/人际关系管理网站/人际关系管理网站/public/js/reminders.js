/**
 * 提醒功能模块
 */
const Reminders = {
  // 当前页码
  currentPage: 1,
  // 每页显示数量
  pageSize: 10,
  // 总页数
  totalPages: 1,
  // 筛选条件
  filters: {
    contactId: '',
    type: '',
    isActive: 'true'
  },
  
  // 初始化提醒页面
  init() {
    // 加载联系人列表到筛选和表单中
    this.loadContacts();
    
    // 加载提醒列表
    this.loadReminders();
    
    // 设置事件监听器
    this.setupEventListeners();
  },
  
  // 加载联系人列表
  async loadContacts() {
    try {
      const response = await API.contacts.getAll();
      const contacts = response.contacts;
      
      // 填充筛选下拉框
      const filterSelect = document.getElementById('contact-select');
      const quickSelect = document.getElementById('quick-contact');
      const modalSelect = document.getElementById('reminder-contact');
      
      // 清空现有选项（保留第一个）
      filterSelect.innerHTML = '<option value="">全部联系人</option>';
      quickSelect.innerHTML = '<option value="">选择联系人...</option>';
      modalSelect.innerHTML = '<option value="">选择联系人...</option>';
      
      // 添加联系人选项
      contacts.forEach(contact => {
        const option = `<option value="${contact.id}">${contact.name}</option>`;
        filterSelect.insertAdjacentHTML('beforeend', option);
        quickSelect.insertAdjacentHTML('beforeend', option);
        modalSelect.insertAdjacentHTML('beforeend', option);
      });
    } catch (error) {
      console.error('加载联系人失败:', error);
      this.showAlert('filter-form', '加载联系人失败，请刷新页面重试', 'danger');
    }
  },
  
  // 设置事件监听器
  setupEventListeners() {
    // 筛选表单提交
    const filterForm = document.getElementById('filter-form');
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.filters.contactId = document.getElementById('contact-select').value;
      this.filters.type = document.getElementById('type-select').value;
      this.filters.isActive = document.getElementById('status-select').value;
      this.currentPage = 1;
      this.loadReminders();
    });
    
    // 快速创建提醒表单提交
    const quickForm = document.getElementById('quick-reminder-form');
    quickForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.createQuickReminder();
    });
    
    // 添加提醒表单提交
    const saveBtn = document.getElementById('save-reminder-btn');
    saveBtn.addEventListener('click', () => {
      this.createReminder();
    });
    
    // 周期性提醒切换
    const recurringCheckbox = document.getElementById('reminder-recurring');
    recurringCheckbox.addEventListener('change', (e) => {
      document.getElementById('reminder-pattern').disabled = !e.target.checked;
    });
    
    // 标签页切换事件
    const reminderTabs = document.querySelectorAll('#reminderTabs button');
    reminderTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabId = e.target.id;
        
        // 根据标签加载不同类型的提醒
        if (tabId === 'upcoming-tab') {
          this.loadUpcomingReminders();
        } else if (tabId === 'today-tab') {
          this.loadTodayReminders();
        } else if (tabId === 'recurring-tab') {
          this.loadRecurringReminders();
        } else if (tabId === 'all-tab') {
          this.loadReminders();
        }
      });
    });
    
    // 编辑提醒按钮
    const editBtn = document.getElementById('edit-reminder-btn');
    editBtn.addEventListener('click', () => {
      const reminderId = editBtn.dataset.id;
      this.openEditModal(reminderId);
    });
    
    // 删除提醒按钮
    const deleteBtn = document.getElementById('delete-reminder-btn');
    deleteBtn.addEventListener('click', () => {
      const reminderId = deleteBtn.dataset.id;
      this.deleteReminder(reminderId);
    });
  },
  
  // 加载所有提醒
  async loadReminders() {
    try {
      // 显示加载状态
      document.getElementById('all-reminders-list').innerHTML = `
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">加载中...</span>
          </div>
        </div>
      `;
      
      // 构建查询参数
      const params = {
        page: this.currentPage,
        limit: this.pageSize,
        ...this.filters
      };
      
      // 获取提醒列表
      const response = await API.reminders.getAll(params);
      const { reminders, count, pages } = response;
      
      // 更新分页信息
      this.totalPages = pages;
      
      // 渲染提醒列表
      this.renderRemindersList(reminders, 'all-reminders-list');
      
      // 渲染分页
      this.renderPagination();
    } catch (error) {
      console.error('加载提醒列表失败:', error);
      document.getElementById('all-reminders-list').innerHTML = `
        <div class="alert alert-danger m-3">加载提醒列表失败，请稍后再试</div>
      `;
    }
  },
  
  // 加载即将到来的提醒
  async loadUpcomingReminders() {
    try {
      // 显示加载状态
      document.getElementById('upcoming-reminders-list').innerHTML = `
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">加载中...</span>
          </div>
        </div>
      `;
      
      // 获取未来30天内的提醒
      const today = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(today.getDate() + 30);
      
      const params = {
        isActive: 'true',
        startDate: today.toISOString().split('T')[0],
        endDate: thirtyDaysLater.toISOString().split('T')[0],
        limit: 50
      };
      
      const response = await API.reminders.getAll(params);
      const reminders = response.reminders;
      
      // 渲染提醒列表
      this.renderRemindersList(reminders, 'upcoming-reminders-list');
    } catch (error) {
      console.error('加载即将到来的提醒失败:', error);
      document.getElementById('upcoming-reminders-list').innerHTML = `
        <div class="alert alert-danger m-3">加载提醒列表失败，请稍后再试</div>
      `;
    }
  },
  
  // 加载今日提醒
  async loadTodayReminders() {
    try {
      // 显示加载状态
      document.getElementById('today-reminders-list').innerHTML = `
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">加载中...</span>
          </div>
        </div>
      `;
      
      // 获取今日提醒
      const today = new Date().toISOString().split('T')[0];
      
      const params = {
        isActive: 'true',
        date: today,
        limit: 50
      };
      
      const response = await API.reminders.getAll(params);
      const reminders = response.reminders;
      
      // 渲染提醒列表
      this.renderRemindersList(reminders, 'today-reminders-list');
    } catch (error) {
      console.error('加载今日提醒失败:', error);
      document.getElementById('today-reminders-list').innerHTML = `
        <div class="alert alert-danger m-3">加载提醒列表失败，请稍后再试</div>
      `;
    }
  },
  
  // 加载周期性提醒
  async loadRecurringReminders() {
    try {
      // 显示加载状态
      document.getElementById('recurring-reminders-list').innerHTML = `
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">加载中...</span>
          </div>
        </div>
      `;
      
      // 获取周期性提醒
      const params = {
        isActive: 'true',
        isRecurring: 'true',
        limit: 50
      };
      
      const response = await API.reminders.getAll(params);
      const reminders = response.reminders;
      
      // 渲染提醒列表
      this.renderRemindersList(reminders, 'recurring-reminders-list');
    } catch (error) {
      console.error('加载周期性提醒失败:', error);
      document.getElementById('recurring-reminders-list').innerHTML = `
        <div class="alert alert-danger m-3">加载提醒列表失败，请稍后再试</div>
      `;
    }
  },
  
  // 渲染提醒列表
  renderRemindersList(reminders, containerId) {
    const container = document.getElementById(containerId);
    
    if (reminders.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-calendar-x text-muted" style="font-size: 3rem;"></i>
          <p class="mt-3 text-muted">暂无提醒</p>
        </div>
      `;
      return;
    }
    
    // 清空容器
    container.innerHTML = '';
    
    // 添加提醒项
    reminders.forEach(reminder => {
      // 格式化日期
      const date = new Date(reminder.date);
      const formattedDate = date.toLocaleDateString('zh-CN');
      
      // 计算距离今天的天数
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      const diffTime = date - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // 设置提醒类型标签
      let typeLabel = '';
      let typeClass = '';
      
      switch (reminder.type) {
        case 'birthday':
          typeLabel = '生日';
          typeClass = 'bg-danger';
          break;
        case 'anniversary':
          typeLabel = '纪念日';
          typeClass = 'bg-success';
          break;
        case 'meeting':
          typeLabel = '会面';
          typeClass = 'bg-primary';
          break;
        case 'call':
          typeLabel = '通话';
          typeClass = 'bg-info';
          break;
        default:
          typeLabel = '其他';
          typeClass = 'bg-secondary';
      }
      
      // 设置日期标签
      let dateLabel = '';
      let dateClass = '';
      
      if (diffDays === 0) {
        dateLabel = '今天';
        dateClass = 'bg-danger';
      } else if (diffDays === 1) {
        dateLabel = '明天';
        dateClass = 'bg-warning';
      } else if (diffDays > 1 && diffDays <= 7) {
        dateLabel = `${diffDays}天后`;
        dateClass = 'bg-info';
      } else if (diffDays > 7) {
        dateLabel = `${diffDays}天后`;
        dateClass = 'bg-secondary';
      } else {
        dateLabel = `${Math.abs(diffDays)}天前`;
        dateClass = 'bg-dark';
      }
      
      // 创建提醒项HTML
      const reminderHtml = `
        <div class="list-group-item list-group-item-action" data-id="${reminder.id}">
          <div class="d-flex w-100 justify-content-between align-items-center">
            <div class="d-flex align-items-center">
              <img src="${reminder.Contact.avatar || '/img/default-avatar.png'}" class="rounded-circle me-3" width="40" height="40" alt="联系人头像">
              <div>
                <h6 class="mb-0">${reminder.title}</h6>
                <div class="small text-muted">${reminder.Contact.name}</div>
              </div>
            </div>
            <div class="text-end">
              <div class="d-flex align-items-center">
                <span class="badge ${typeClass} me-2">${typeLabel}</span>
                <span class="badge ${dateClass}">${dateLabel}</span>
              </div>
              <div class="small text-muted mt-1">${formattedDate}</div>
            </div>
          </div>
        </div>
      `;
      
      // 添加到容器
      container.insertAdjacentHTML('beforeend', reminderHtml);
    });
    
    // 添加点击事件
    const reminderItems = container.querySelectorAll('.list-group-item');
    reminderItems.forEach(item => {
      item.addEventListener('click', () => {
        const reminderId = item.dataset.id;
        this.openReminderDetail(reminderId);
      });
    });
  },
  
  // 渲染分页
  renderPagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    // 如果只有一页，不显示分页
    if (this.totalPages <= 1) {
      return;
    }
    
    // 上一页按钮
    const prevDisabled = this.currentPage === 1 ? 'disabled' : '';
    const prevHtml = `
      <li class="page-item ${prevDisabled}">
        <a class="page-link" href="#" data-page="${this.currentPage - 1}" aria-label="上一页">
          <span aria-hidden="true">&laquo;</span>
        </a>
      </li>
    `;
    pagination.insertAdjacentHTML('beforeend', prevHtml);
    
    // 页码按钮
    const maxPages = 5; // 最多显示的页码数
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPages - 1);
    
    // 调整起始页
    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const active = i === this.currentPage ? 'active' : '';
      const pageHtml = `
        <li class="page-item ${active}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `;
      pagination.insertAdjacentHTML('beforeend', pageHtml);
    }
    
    // 下一页按钮
    const nextDisabled = this.currentPage === this.totalPages ? 'disabled' : '';
    const nextHtml = `
      <li class="page-item ${nextDisabled}">
        <a class="page-link" href="#" data-page="${this.currentPage + 1}" aria-label="下一页">
          <span aria-hidden="true">&raquo;</span>
        </a>
      </li>
    `;
    pagination.insertAdjacentHTML('beforeend', nextHtml);
    
    // 添加页码点击事件
    const pageLinks = pagination.querySelectorAll('.page-link');
    pageLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = parseInt(e.target.dataset.page || e.target.parentElement.dataset.page);
        if (page && page !== this.currentPage) {
          this.currentPage = page;
          this.loadReminders();
        }
      });
    });
  },
  
  // 打开提醒详情
  async openReminderDetail(reminderId) {
    try {
      // 获取提醒详情
      const response = await API.reminders.getById(reminderId);
      const reminder = response.reminder;
      
      // 填充详情模态框
      document.getElementById('detail-title').textContent = reminder.title;
      document.getElementById('detail-avatar').src = reminder.Contact.avatar || '/img/default-avatar.png';
      document.getElementById('detail-contact-name').textContent = reminder.Contact.name;
      
      // 设置提醒类型
      let typeLabel = '';
      switch (reminder.type) {
        case 'birthday': typeLabel = '生日'; break;
        case 'anniversary': typeLabel = '纪念日'; break;
        case 'meeting': typeLabel = '会面'; break;
        case 'call': typeLabel = '通话'; break;
        default: typeLabel = '其他';
      }
      document.getElementById('detail-type').textContent = typeLabel;
      
      // 设置描述
      document.getElementById('detail-description').textContent = reminder.description || '无描述';
      
      // 设置日期
      const date = new Date(reminder.date);
      document.getElementById('detail-date').textContent = date.toLocaleDateString('zh-CN');
      
      // 设置农历标记
      const lunarBadge = document.getElementById('detail-lunar');
      if (reminder.isLunar) {
        lunarBadge.textContent = '农历';
        lunarBadge.classList.remove('d-none');
      } else {
        lunarBadge.classList.add('d-none');
      }
      
      // 设置状态
      const statusBadge = document.getElementById('detail-status');
      if (reminder.isActive) {
        statusBadge.textContent = '活跃';
        statusBadge.className = 'badge bg-success';
      } else {
        statusBadge.textContent = '已完成';
        statusBadge.className = 'badge bg-secondary';
      }
      
      // 设置周期性
      let recurringText = '不重复';
      if (reminder.isRecurring) {
        switch (reminder.recurringPattern) {
          case 'daily': recurringText = '每天'; break;
          case 'weekly': recurringText = '每周'; break;
          case 'biweekly': recurringText = '每两周'; break;
          case 'monthly': recurringText = '每月'; break;
          case 'quarterly': recurringText = '每季度'; break;
          case 'yearly': recurringText = '每年'; break;
          default: recurringText = reminder.recurringPattern;
        }
      }
      document.getElementById('detail-recurring').textContent = recurringText;
      
      // 设置提前通知
      document.getElementById('detail-advance').textContent = `${reminder.advanceNoticeDays}天`;
      
      // 设置创建时间
      const createdDate = new Date(reminder.createdAt);
      document.getElementById('detail-created').textContent = createdDate.toLocaleDateString('zh-CN');
      
      // 设置下次触发
      if (reminder.nextTrigger) {
        const nextTriggerDate = new Date(reminder.nextTrigger);
        document.getElementById('detail-next-trigger').textContent = nextTriggerDate.toLocaleDateString('zh-CN');
      } else {
        document.getElementById('detail-next-trigger').textContent = '无';
      }
      
      // 设置按钮数据
      document.getElementById('edit-reminder-btn').dataset.id = reminder.id;
      document.getElementById('delete-reminder-btn').dataset.id = reminder.id;
      
      // 显示模态框
      const modal = new bootstrap.Modal(document.getElementById('reminderDetailModal'));
      modal.show();
    } catch (error) {
      console.error('获取提醒详情失败:', error);
      this.showAlert('all-reminders-list', '获取提醒详情失败，请稍后再试', 'danger');
    }
  },
  
  // 打开编辑模态框
  async openEditModal(reminderId) {
    try {
      // 关闭详情模态框
      const detailModal = bootstrap.Modal.getInstance(document.getElementById('reminderDetailModal'));
      detailModal.hide();
      
      // 获取提醒详情
      const response = await API.reminders.getById(reminderId);
      const reminder = response.reminder;
      
      // 填充表单
      document.getElementById('reminder-contact').value = reminder.contactId;
      document.getElementById('reminder-type').value = reminder.type;
      document.getElementById('reminder-title').value = reminder.title;
      document.getElementById('reminder-description').value = reminder.description || '';
      
      // 设置日期（去掉时间部分）
      const date = new Date(reminder.date);
      const formattedDate = date.toISOString().split('T')[0];
      document.getElementById('reminder-date').value = formattedDate;
      
      // 设置农历
      document.getElementById('reminder-lunar').checked = reminder.isLunar;
      
      // 设置周期性
      document.getElementById('reminder-recurring').checked = reminder.isRecurring;
      document.getElementById('reminder-pattern').disabled = !reminder.isRecurring;
      if (reminder.isRecurring && reminder.recurringPattern) {
        document.getElementById('reminder-pattern').value = reminder.recurringPattern;
      }
      
      // 设置提前通知天数
      document.getElementById('reminder-advance').value = reminder.advanceNoticeDays;
      
      // 修改模态框标题和按钮
      document.querySelector('#addReminderModal .modal-title').textContent = '编辑提醒';
      const saveBtn = document.getElementById('save-reminder-btn');
      saveBtn.textContent = '更新';
      saveBtn.dataset.id = reminder.id;
      saveBtn.dataset.mode = 'edit';
      
      // 显示模态框
      const modal = new bootstrap.Modal(document.getElementById('addReminderModal'));
      modal.show();
    } catch (error) {
      console.error('获取提醒详情失败:', error);
      this.showAlert('all-reminders-list', '获取提醒详情失败，请稍后再试', 'danger');
    }
  },
  
  // 创建快速提醒
  async createQuickReminder() {
    try {
      const contactId = document.getElementById('quick-contact').value;
      const title = document.getElementById('quick-title').value;
      const date = document.getElementById('quick-date').value;
      const type = document.getElementById('quick-type').value;
      
      if (!contactId || !title || !date) {
        this.showAlert('quick-reminder-form', '请填写所有必填字段', 'danger');
        return;
      }
      
      // 创建提醒数据
      const reminderData = {
        contactId,
        title,
        date,
        type,
        isLunar: false,
        isRecurring: false,
        advanceNoticeDays: 1
      };
      
      // 发送请求
      await API.reminders.create(reminderData);
      
      // 重置表单
      document.getElementById('quick-reminder-form').reset();
      
      // 显示成功消息
      this.showAlert('quick-reminder-form', '提醒创建成功', 'success');
      
      // 重新加载提醒列表
      this.loadReminders();
      this.loadUpcomingReminders();
    } catch (error) {
      console.error('创建提醒失败:', error);
      this.showAlert('quick-reminder-form', '创建提醒失败，请稍后再试', 'danger');
    }
  },
  
  // 创建或更新提醒
  async createReminder() {
    try {
      const saveBtn = document.getElementById('save-reminder-btn');
      const isEdit = saveBtn.dataset.mode === 'edit';
      const reminderId = saveBtn.dataset.id;
      
      // 获取表单数据
      const contactId = document.getElementById('reminder-contact').value;
      const type = document.getElementById('reminder-type').value;
      const title = document.getElementById('reminder-title').value;
      const description = document.getElementById('reminder-description').value;
      const date = document.getElementById('reminder-date').value;
      const isLunar = document.getElementById('reminder-lunar').checked;
      const isRecurring = document.getElementById('reminder-recurring').checked;
      const recurringPattern = document.getElementById('reminder-pattern').value;
      const advanceNoticeDays = parseInt(document.getElementById('reminder-advance').value) || 1;
      
      // 验证必填字段
      if (!contactId || !type || !title || !date) {
        this.showAlert('add-reminder-alert', '请填写所有必填字段', 'danger');
        return;
      }
      
      // 创建提醒数据
      const reminderData = {
        contactId,
        type,
        title,
        description,
        date,
        isLunar,
        isRecurring,
        recurringPattern: isRecurring ? recurringPattern : null,
        advanceNoticeDays,
        isActive: true
      };
      
      // 发送请求
      if (isEdit) {
        await API.reminders.update(reminderId, reminderData);
      } else {
        await API.reminders.create(reminderData);
      }
      
      // 关闭模态框
      const modal = bootstrap.Modal.getInstance(document.getElementById('addReminderModal'));
      modal.hide();
      
      // 重置表单和按钮
      document.getElementById('add-reminder-form').reset();
      document.querySelector('#addReminderModal .modal-title').textContent = '添加提醒';
      saveBtn.textContent = '保存';
      delete saveBtn.dataset.id;
      delete saveBtn.dataset.mode;
      
      // 重新加载提醒列表
      this.loadReminders();
      this.loadUpcomingReminders();
      this.loadTodayReminders();
      this.loadRecurringReminders();
      
      // 显示成功消息
      const message = isEdit ? '提醒更新成功' : '提醒创建成功';
      this.showAlert('all-reminders-list', message, 'success', true);
    } catch (error) {
      console.error('保存提醒失败:', error);
      this.showAlert('add-reminder-alert', '保存提醒失败，请稍后再试', 'danger');
    }
  },
  
  // 删除提醒
  async deleteReminder(reminderId) {
    try {
      if (!confirm('确定要删除这个提醒吗？此操作不可撤销。')) {
        return;
      }
      
      // 发送删除请求
      await API.reminders.delete(reminderId);
      
      // 关闭详情模态框
      const modal = bootstrap.Modal.getInstance(document.getElementById('reminderDetailModal'));
      modal.hide();
      
      // 重新加载提醒列表
      this.loadReminders();
      this.loadUpcomingReminders();
      this.loadTodayReminders();
      this.loadRecurringReminders();
      
      // 显示成功消息
      this.showAlert('all-reminders-list', '提醒已成功删除', 'success', true);
    } catch (error) {
      console.error('删除提醒失败:', error);
      this.showAlert('all-reminders-list', '删除提醒失败，请稍后再试', 'danger');
    }
  },
  
  // 显示提示消息
  showAlert(containerId, message, type = 'info', autoHide = false) {
    const container = document.getElementById(containerId);
    const alertId = `alert-${Date.now()}`;
    
    const alertHtml = `
      <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="关闭"></button>
      </div>
    `;
    
    // 如果容器是表单，在表单前插入提示
    if (container.tagName === 'FORM') {
      container.insertAdjacentHTML('beforebegin', alertHtml);
    } else {
      // 否则在容器开头插入
      container.insertAdjacentHTML('afterbegin', alertHtml);
    }
    
    // 自动隐藏
    if (autoHide) {
      setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
          const bsAlert = new bootstrap.Alert(alertElement);
          bsAlert.close();
        }
      }, 3000);
    }
  }