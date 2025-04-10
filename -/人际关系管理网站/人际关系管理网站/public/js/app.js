/**
 * 主应用脚本
 */
const App = {
  // 初始化应用
  init() {
    // 设置全局事件监听器
    this.setupEventListeners();
    
    // 初始化页面特定功能
    this.initPageSpecificFeatures();
  },
  
  // 设置全局事件监听器
  setupEventListeners() {
    // 全局搜索
    const globalSearch = document.getElementById('global-search');
    if (globalSearch) {
      globalSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleGlobalSearch(e.target.value);
        }
      });
    }
    
    // 导航栏活跃项
    this.setActiveNavItem();
  },
  
  // 初始化页面特定功能
  initPageSpecificFeatures() {
    const path = window.location.pathname;
    
    // 根据路径加载对应页面功能
    if (path === '/' || path === '/index.html') {
      this.initDashboard();
    } else if (path.startsWith('/contacts')) {
      this.initContactsPage();
    } else if (path.startsWith('/interactions')) {
      this.initInteractionsPage();
    } else if (path.startsWith('/reminders')) {
      this.initRemindersPage();
    } else if (path.startsWith('/network')) {
      this.initNetworkPage();
    } else if (path.startsWith('/analytics')) {
      this.initAnalyticsPage();
    } else if (path.startsWith('/profile')) {
      this.initProfilePage();
    } else if (path.startsWith('/settings')) {
      this.initSettingsPage();
    }
  },
  
  // 设置导航栏活跃项
  setActiveNavItem() {
    const path = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      
      if (href === '/' && (path === '/' || path === '/index.html')) {
        link.classList.add('active');
      } else if (href !== '/' && path.startsWith(href)) {
        link.classList.add('active');
      }
    });
  },
  
  // 处理全局搜索
  async handleGlobalSearch(query) {
    if (!query.trim()) return;
    
    try {
      // 显示加载状态
      this.showLoading('global-search-results');
      
      // 搜索联系人
      const contactsResponse = await API.contacts.getAll({ search: query });
      
      // 搜索互动记录
      const interactionsResponse = await API.interactions.getAll({ 
        search: query,
        limit: 5
      });
      
      // 搜索提醒
      const remindersResponse = await API.reminders.getAll({
        search: query,
        limit: 5
      });
      
      // 显示搜索结果
      this.displaySearchResults({
        query,
        contacts: contactsResponse.contacts,
        interactions: interactionsResponse.interactions,
        reminders: remindersResponse.reminders
      });
    } catch (error) {
      console.error('搜索失败:', error);
      this.showAlert('global-search-results', '搜索失败，请稍后再试', 'danger');
    }
  },
  
  // 显示搜索结果
  displaySearchResults({ query, contacts, interactions, reminders }) {
    // 实现搜索结果显示逻辑
    console.log('搜索结果:', { query, contacts, interactions, reminders });
    
    // 创建搜索结果模态框
    const modalHtml = `
      <div class="modal fade" id="searchResultsModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">搜索结果: "${query}"</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <ul class="nav nav-tabs" id="searchResultTabs" role="tablist">
                <li class="nav-item" role="presentation">
                  <button class="nav-link active" id="contacts-tab" data-bs-toggle="tab" data-bs-target="#contacts-results" type="button" role="tab">联系人 (${contacts.length})</button>
                </li>
                <li class="nav-item" role="presentation">
                  <button class="nav-link" id="interactions-tab" data-bs-toggle="tab" data-bs-target="#interactions-results" type="button" role="tab">互动记录 (${interactions.length})</button>
                </li>
                <li class="nav-item" role="presentation">
                  <button class="nav-link" id="reminders-tab" data-bs-toggle="tab" data-bs-target="#reminders-results" type="button" role="tab">提醒 (${reminders.length})</button>
                </li>
              </ul>
              <div class="tab-content p-3" id="searchResultTabContent">
                <div class="tab-pane fade show active" id="contacts-results" role="tabpanel">