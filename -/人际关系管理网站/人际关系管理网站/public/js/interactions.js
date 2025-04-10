/**
 * 互动记录页面的JavaScript功能
 */

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', async () => {
  // 检查用户是否已登录
  if (!await checkAuth()) {
    window.location.href = '/login.html';
    return;
  }

  // 初始化变量
  let currentPage = 1;
  let totalPages = 1;
  let currentInteractionId = null;
  let contacts = [];
  const interactionsTableBody = document.getElementById('interactions-table-body');
  const pagination = document.getElementById('pagination');
  const totalCount = document.getElementById('total-count');
  const filterForm = document.getElementById('filter-form');
  const resetFilterBtn = document.getElementById('reset-filter-btn');
  const newInteractionBtn = document.getElementById('new-interaction-btn');
  const interactionModal = new bootstrap.Modal(document.getElementById('interaction-modal'));
  const viewInteractionModal = new bootstrap.Modal(document.getElementById('view-interaction-modal'));
  const deleteConfirmModal = new bootstrap.Modal(document.getElementById('delete-confirm-modal'));
  const saveInteractionBtn = document.getElementById('save-interaction-btn');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const editInteractionBtn = document.getElementById('edit-interaction-btn');
  const interactionFollowUp = document.getElementById('interaction-follow-up');
  const followUpFields = document.getElementById('follow-up-fields');
  const listViewBtn = document.getElementById('list-view-btn');
  const calendarViewBtn = document.getElementById('calendar-view-btn');
  const listView = document.getElementById('list-view');
  const calendarView = document.getElementById('calendar-view');

  // 初始化页面
  await Promise.all([loadContacts(), loadInteractions()]);
  addEventListeners();

  // 加载联系人列表
  async function loadContacts() {
    try {
      const response = await API.contacts.getAll();
      contacts = response.contacts;
      
      // 填充联系人筛选下拉框
      const contactFilter = document.getElementById('contact-filter');
      contactFilter.innerHTML = '<option value="">全部联系人</option>';
      
      // 填充互动记录表单的联系人下拉框
      const interactionContact = document.getElementById('interaction-contact');
      interactionContact.innerHTML = '<option value="">选择联系人</option>';
      
      contacts.forEach(contact => {
        const filterOption = document.createElement('option');
        filterOption.value = contact.id;
        filterOption.textContent = contact.name;
        contactFilter.appendChild(filterOption);
        
        const formOption = document.createElement('option');
        formOption.value = contact.id;
        formOption.textContent = contact.name;
        interactionContact.appendChild(formOption);
      });
    } catch (error) {
      console.error('加载联系人失败:', error);
      showToast('加载联系人失败，请刷新页面重试', 'danger');
    }
  }

  // 加载互动记录列表
  async function loadInteractions(page = 1, filters = {}) {
    try {
      interactionsTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">加载中...</td></tr>';
      
      const params = {
        page,
        limit: 10,
        ...filters
      };
      
      const response = await API.interactions.getAll(params);
      const { interactions, count, pages } = response;
      
      currentPage = parseInt(page);
      totalPages = parseInt(pages);
      
      // 更新总数显示
      totalCount.textContent = count;
      
      // 渲染互动记录列表
      if (interactions.length === 0) {
        interactionsTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">暂无互动记录</td></tr>';
      } else {
        interactionsTableBody.innerHTML = interactions.map(interaction => {
          // 格式化日期
          const date = new Date(interaction.date);
          const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          
          // 获取情绪对应的标签样式
          let moodBadge = '';
          switch (interaction.mood) {
            case 'very_positive':
              moodBadge = '<span class="badge bg-success">非常积极</span>';
              break;
            case 'positive':
              moodBadge = '<span class="badge bg-info">积极</span>';
              break;
            case 'neutral':
              moodBadge = '<span class="badge bg-secondary">中性</span>';
              break;
            case 'negative':
              moodBadge = '<span class="badge bg-warning">消极</span>';
              break;
            case 'very_negative':
              moodBadge = '<span class="badge bg-danger">非常消极</span>';
              break;
            default:
              moodBadge = '<span class="badge bg-secondary">中性</span>';
          }
          
          // 获取互动类型对应的图标和文本
          let typeIcon = '';
          let typeText = '';
          switch (interaction.type) {
            case 'call':
              typeIcon = '<i class="bi bi-telephone me-1"></i>';
              typeText = '通话';
              break;
            case 'meeting':
              typeIcon = '<i class="bi bi-people me-1"></i>';
              typeText = '见面';
              break;
            case 'message':
              typeIcon = '<i class="bi bi-chat me-1"></i>';
              typeText = '消息';
              break;
            case 'email':
              typeIcon = '<i class="bi bi-envelope me-1"></i>';
              typeText = '邮件';
              break;
            case 'gift':
              typeIcon = '<i class="bi bi-gift me-1"></i>';
              typeText = '礼物';
              break;
            case 'activity':
              typeIcon = '<i class="bi bi-calendar-event me-1"></i>';
              typeText = '活动';
              break;
            default:
              typeIcon = '<i class="bi bi-three-dots me-1"></i>';
              typeText = '其他';
          }
          
          return `
            <tr>
              <td>
                <div class="d-flex align-items-center">
                  <img src="${interaction.Contact.avatar || '/img/default-avatar.png'}" alt="${interaction.Contact.name}" class="rounded-circle me-2" width="32" height="32">
                  <span>${interaction.Contact.name}</span>
                </div>
              </td>
              <td>${typeIcon}${typeText}</td>
              <td>${interaction.title}</td>
              <td>${formattedDate}</td>
              <td>${moodBadge}</td>
              <td>
                <div class="btn-group btn-group-sm">
                  <button type="button" class="btn btn-outline-primary view-interaction" data-id="${interaction.id}" title="查看">
                    <i class="bi bi-eye"></i>
                  </button>
                  <button type="button" class="btn btn-outline-secondary edit-interaction" data-id="${interaction.id}" title="编辑">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button type="button" class="btn btn-outline-danger delete-interaction" data-id="${interaction.id}" title="删除">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
      
      // 渲染分页
      renderPagination();
      
      // 添加事件监听器
      addInteractionEventListeners();
    } catch (error) {
      console.error('加载互动记录失败:', error);
      interactionsTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">加载失败，请刷新页面重试</td></tr>';
    }
  }

  // 渲染分页
  function renderPagination() {
    pagination.innerHTML = '';
    
    // 如果只有一页，不显示分页
    if (totalPages <= 1) {
      return;
    }
    
    // 上一页按钮
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="上一页"><span aria-hidden="true">&laquo;</span></a>`;
    pagination.appendChild(prevLi);
    
    // 页码按钮
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const pageLi = document.createElement('li');
      pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
      pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
      pagination.appendChild(pageLi);
    }
    
    // 下一页按钮
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="下一页"><span aria-hidden="true">&raquo;</span></a>`;
    pagination.appendChild(nextLi);
  }

  // 获取筛选条件
  function getFilters() {
    const contactId = document.getElementById('contact-filter').value;
    const type = document.getElementById('type-filter').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    const filters = {};
    
    if (contactId) filters.contactId = contactId;
    if (type) filters.type = type;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    return filters;
  }

  // 重置表单
  function resetInteractionForm() {
    document.getElementById('interaction-form').reset();
    document.getElementById('interaction-id').value = '';
    document.getElementById('interaction-modal-title').textContent = '新建互动记录';
    document.getElementById('interaction-date').value = new Date().toISOString().slice(0, 16);
    followUpFields.classList.add('d-none');
  }

  // 填充互动记录表单
  function fillInteractionForm(interaction) {
    document.getElementById('interaction-id').value = interaction.id;
    document.getElementById('interaction-contact').value = interaction.contactId;
    document.getElementById('interaction-type').value = interaction.type;
    document.getElementById('interaction-title').value = interaction.title;
    document.getElementById('interaction-content').value = interaction.content || '';
    document.getElementById('interaction-mood').value = interaction.mood;
    document.getElementById('interaction-location').value = interaction.location || '';
    
    // 格式化日期时间
    const date = new Date(interaction.date);
    const formattedDate = date.toISOString().slice(0, 16);
    document.getElementById('interaction-date').value = formattedDate;
    
    document.getElementById('interaction-duration').value = interaction.duration || '';
    document.getElementById('interaction-topics').value = interaction.topics || '';
    document.getElementById('interaction-key-points').value = interaction.keyPoints || '';
    document.getElementById('interaction-follow-up').checked = interaction.followUpRequired;
    
    if (interaction.followUpRequired) {
      followUpFields.classList.remove('d-none');
      if (interaction.followUpDate) {
        const followUpDate = new Date(interaction.followUpDate);
        document.getElementById('interaction-follow-up-date').value = followUpDate.toISOString().slice(0, 10);
      } else {
        document.getElementById('interaction-follow-up-date').value = '';
      }
      document.getElementById('interaction-follow-up-notes').value = interaction.followUpNotes || '';
    } else {
      followUpFields.classList.add('d-none');
    }
    
    document.getElementById('interaction-private').checked = interaction.isPrivate;
    document.getElementById('interaction-modal-title').textContent = '编辑互动记录';
  }

  // 渲染互动记录详情
  function renderInteractionDetail(interaction) {
    // 格式化日期
    const date = new Date(interaction.date);
    const formattedDate = `${date.getFullYear()}年${(date.getMonth() + 1)}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    // 获取情绪对应的标签样式
    let moodBadge = '';
    switch (interaction.mood) {
      case 'very_positive':
        moodBadge = '<span class="badge bg-success">非常积极</span>';
        break;
      case 'positive':
        moodBadge = '<span class="badge bg-info">积极</span>';
        break;
      case 'neutral':
        moodBadge = '<span class="badge bg-secondary">中性</span>';
        break;
      case 'negative':
        moodBadge = '<span class="badge bg-warning">消极</span>';
        break;
      case 'very_negative':
        moodBadge = '<span class="badge bg-danger">非常消极</span>';
        break;
      default:
        moodBadge = '<span class="badge bg-secondary">中性</span>';
    }
    
    // 获取互动类型对应的图标和文本
    let typeIcon = '';
    let typeText = '';
    switch (interaction.type) {
      case 'call':
        typeIcon = '<i class="bi bi-telephone me-1"></i>';
        typeText = '通话';
        break;
      case 'meeting':
        typeIcon = '<i class="bi bi-people me-1"></i>';
        typeText = '见面';
        break;
      case 'message':
        typeIcon = '<i class="bi bi-chat me-1"></i>';
        typeText = '消息';
        break;
      case 'email':
        typeIcon = '<i class="bi bi-envelope me-1"></i>';
        typeText = '邮件';
        break;
      case 'gift':
        typeIcon = '<i class="bi bi-gift me-1"></i>';
        typeText = '礼物';
        break;
      case 'activity':
        typeIcon = '<i class="bi bi-calendar-event me-1"></i>';
        typeText = '活动';
        break;
      default:
        typeIcon = '<i class="bi bi-three-dots me-1"></i>';
        typeText = '其他';
    }
    
    // 构建详情HTML
    let detailHtml = `
      <div class="mb-4">
        <div class="d-flex align-items-center mb-3">
          <img src="${interaction.Contact.avatar || '/img/default-avatar.png'}" alt="${interaction.Contact.name}" class="rounded-circle me-3" width="64" height="64">
          <div>
            <h4 class="mb-1">${interaction.title}</h4>
            <div class="text-muted">
              <span class="me-3">${typeIcon}${typeText}</span>
              <span class="me-3"><i class="bi bi-calendar3 me-1"></i>${formattedDate}</span>
              ${moodBadge}
            </div>
          </div>
        </div>
        <div class="mb-3">
          <h5>联系人</h5>
          <p><a href="/contacts/${interaction.Contact.id}">${interaction.Contact.name}</a></p>
        </div>
    `;
    
    // 添加内容详情（如果有）
    if (interaction.content) {
      detailHtml += `
        <div class="mb-3">
          <h5>内容详情</h5>
          <p>${interaction.content.replace(/\n/g, '<br>')}</p>
        </div>
      `;
    }
    
    // 添加地点（如果有）
    if (interaction.location) {
      detailHtml += `
        <div class="mb-3">
          <h5>地点</h5>
          <p><i class="bi bi-geo-alt me-1"></i>${interaction.location}</p>
        </div>
      `;
    }
    
    // 添加持续时间（如果有）
    if (interaction.duration) {
      detailHtml += `
        <div class="mb-3">
          <h5>持续时间</h5>
          <p><i class="bi bi-clock me-1"></i>${interaction.duration} 分钟</p>
        </div>
      `;
    }
    
    // 添加谈话主题（如果有）
    if (interaction.topics) {
      const topicsArray = interaction.topics.split(',');
      const topicsHtml = topicsArray.map(topic => `<span class="badge bg-light text-dark me-2 mb-2">${topic.trim()}</span>`).join('');
      
      detailHtml += `
        <div class="mb-3">
          <h5>谈话主题</h5>
          <div>${topicsHtml}</div>
        </div>
      `;
    }
    
    // 添加关键点（如果有）
    if (interaction.keyPoints) {
      detailHtml += `
        <div class="mb-3">
          <h5>关键点</h5>
          <p>${interaction.keyPoints.replace(/\n/g, '<br>')}</p>
        </div>
      `;
    }
    
    // 添加后续跟进信息（如果需要）
    if (interaction.followUpRequired) {
      let followUpHtml = '<div class="alert alert-info"><i class="bi bi-exclamation-circle me-2"></i>需要后续跟进</div>';
      
      if (interaction.followUpDate) {
        const followUpDate = new Date(interaction.followUpDate);
        const formattedFollowUpDate = `${followUpDate.getFullYear()}年${(followUpDate.getMonth() + 1)}月${followUpDate.getDate()}日`;
        followUpHtml += `<p><strong>计划跟进日期：</strong>${formattedFollowUpDate}</p>`;
      }
      
      if (interaction.followUpNotes) {
        followUpHtml += `<p><strong>跟进备注：</strong>${interaction.followUpNotes.replace(/\n/g, '<br>')}</p>`;
      }
      
      detailHtml += `
        <div class="mb-3">
          <h5>后续跟进</h5>
          ${followUpHtml}
        </div>
      `;
    }
    
    // 添加私密标记（如果是私密记录）
    if (interaction.isPrivate) {
      detailHtml += `
        <div class="mb-3">
          <span class="badge bg-danger"><i class="bi bi-lock-fill me-1"></i>私密记录</span>
        </div>
      `;
    }
    
    // 添加创建和更新时间
    const createdAt = new Date(interaction.createdAt);
    const updatedAt = new Date(interaction.updatedAt);
    const formattedCreatedAt = `${createdAt.getFullYear()}-${(createdAt.getMonth() + 1).toString().padStart(2, '0')}-${createdAt.getDate().toString().padStart(2, '0')} ${createdAt.getHours().toString().padStart(2, '0')}:${createdAt.getMinutes().toString().padStart(2, '0')}`;
    const formattedUpdatedAt = `${updatedAt.getFullYear()}-${(updatedAt.getMonth() + 1).toString().padStart(2, '0')}-${updatedAt.getDate().toString().padStart(2, '0')} ${updatedAt.getHours().toString().padStart(2, '0')}:${updatedAt.getMinutes().toString().padStart(2, '0')}`;
    
    detailHtml += `
      <div class="text-muted mt-4 pt-3 border-top">
        <small>创建时间：${formattedCreatedAt}</small><br>
        <small>最后更新：${formattedUpdatedAt}</small>
      </div>
    `;
    
    detailHtml += '</div>';
    
    // 更新模态框标题和内容
    document.getElementById('view-interaction-title').textContent = interaction.title;
    document.getElementById('view-interaction-body').innerHTML = detailHtml;
  }

  // 保存互动记录
  async function saveInteraction() {
    try {
      // 获取表单数据
      const interactionId = document.getElementById('interaction-id').value;
      const contactId = document.getElementById('interaction-contact').value;
      const type = document.getElementById('interaction-type').value;
      const title = document.getElementById('interaction-title').value;
      const content = document.getElementById('interaction-content').value;
      const mood = document.getElementById('interaction-mood').value;
      const location = document.getElementById('interaction-location').value;
      const date = document.getElementById('interaction-date').value;
      const duration = document.getElementById('interaction-duration').value;
      const topics = document.getElementById('interaction-topics').value;
      const keyPoints = document.getElementById('interaction-key-points').value;
      const followUpRequired = document.getElementById('interaction-follow-up').checked;
      const followUpDate = followUpRequired ? document.getElementById('interaction-follow-up-date').value : null;
      const followUpNotes = followUpRequired ? document.getElementById('interaction-follow-up-notes').value : null;
      const isPrivate = document.getElementById('interaction-private').checked;
      
      // 验证必填字段
      if (!contactId || !title || !date) {
        showToast('请填写所有必填字段', 'warning');
        return;
      }
      
      // 构建互动记录数据
      const interactionData = {
        contactId,
        type,
        title,
        content,
        mood,
        location,
        date,
        duration: duration ? parseInt(duration) : null,
        topics,
        keyPoints,
        followUpRequired,
        followUpDate,
        followUpNotes,
        isPrivate
      };
      
      let response;
      
      // 根据是否有ID判断是新建还是更新
      if (interactionId) {
        response = await API.interactions.update(interactionId, interactionData);
        showToast('互动记录已更新', 'success');
      } else {
        response = await API.interactions.create(interactionData);
        showToast('互动记录已创建', 'success');
      }
      
      // 关闭模态框并刷新列表
      interactionModal.hide();
      const filters = getFilters();
      await loadInteractions(1, filters);
    } catch (error) {
      console.error('保存互动记录失败:', error);
      showToast('保存失败，请重试', 'danger');
    }
  }

  // 删除互动记录
  async function deleteInteraction(id) {
    try {
      await API.interactions.delete(id);
      showToast('互动记录已删除', 'success');
      
      // 刷新列表
      const filters = getFilters();
      await loadInteractions(1, filters);
    } catch (error) {
      console.error('删除互动记录失败:', error);
      showToast('删除失败，请重试', 'danger');
    }
  }

  // 显示消息提示
  function showToast(message, type = 'info') {
    const toastContainer = document.createElement('div');
    toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '5';
    
    const toastHtml = `
      <div class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">
            ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="关闭"></button>
        </div>
      </div>
    `;
    
    toastContainer.innerHTML = toastHtml;
    document.body.appendChild(toastContainer);
    
    const toastElement = toastContainer.querySelector('.toast');
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', () => {
      document.body.removeChild(toastContainer);
    });
  }

  // 添加事件监听器
  function addEventListeners() {
    // 筛选表单提交
    filterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const filters = getFilters();
      await loadInteractions(1, filters);
    });
    
    // 重置筛选按钮
    resetFilterBtn.addEventListener('click', async () => {
      filterForm.reset();
      await loadInteractions(1, {});
    });
    
    // 新建互动记录按钮
    newInteractionBtn.addEventListener('click', () => {
      resetInteractionForm();
      // 设置默认日期时间为当前时间
      document.getElementById('interaction-date').value = new Date().toISOString().slice(0, 16);
      interactionModal.show();
    });
    
    // 保存互动记录按钮
    saveInteractionBtn.addEventListener('click', saveInteraction);
    
    // 后续跟进复选框
    interactionFollowUp.addEventListener('change', (e) => {
      if (e.target.checked) {
        followUpFields.classList.remove('d-none');
      } else {
        followUpFields.classList.add('d-none');
      }
    });
    
    // 视图切换按钮
    listViewBtn.addEventListener('click', () => {
      listViewBtn.classList.add('active');
      calendarViewBtn.classList.remove('active');
      listView.classList.remove('d-none');
      calendarView.classList.add('d-none');
    });
    
    calendarViewBtn.addEventListener('click', () => {
      calendarViewBtn.classList.add('active');
      listViewBtn.classList.remove('active');
      calendarView.classList.remove('d-none');
      listView.classList.add('d-none');
    });
    
    // 编辑互动记录按钮（在查看详情模态框中）
    editInteractionBtn.addEventListener('click', async () => {
      try {
        // 关闭查看详情模态框
        viewInteractionModal.hide();
        
        // 获取互动记录详情
        const response = await API.interactions.getById(currentInteractionId);
        const interaction = response.interaction;
        
        // 填充表单
        fillInteractionForm(interaction);
        
        // 显示编辑模态框
        interactionModal.show();
      } catch (error) {
        console.error('获取互动记录详情失败:', error);
        showToast('获