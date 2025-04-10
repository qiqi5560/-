/**
 * 身份验证管理
 */
const Auth = {
  // 初始化
  init() {
    this.setupAuthListeners();
    this.checkAuthStatus();
  },
  
  // 设置事件监听器
  setupAuthListeners() {
    // 登录表单提交
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', this.handleLogin.bind(this));
    }
    
    // 注册表单提交
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', this.handleRegister.bind(this));
    }
    
    // 忘记密码表单提交
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
      forgotPasswordForm.addEventListener('submit', this.handleForgotPassword.bind(this));
    }
    
    // 重置密码表单提交
    const resetPasswordForm = document.getElementById('reset-password-form');
    if (resetPasswordForm) {
      resetPasswordForm.addEventListener('submit', this.handleResetPassword.bind(this));
    }
    
    // 退出登录按钮
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', this.handleLogout.bind(this));
    }
  },
  
  // 检查认证状态
  async checkAuthStatus() {
    const token = localStorage.getItem('token');
    const currentPath = window.location.pathname;
    
    // 如果没有令牌且不在认证页面，重定向到登录页面
    if (!token && !this.isAuthPage()) {
      this.redirectToLogin();
      return;
    }
    
    // 如果有令牌且在认证页面，重定向到主页
    if (token && this.isAuthPage()) {
      this.redirectToHome();
      return;
    }
    
    // 如果有令牌且不在认证页面，验证令牌有效性
    if (token && !this.isAuthPage()) {
      try {
        const userData = await API.auth.getCurrentUser();
        this.setUserData(userData.user);
        this.updateUserInterface();
      } catch (error) {
        console.error('令牌验证失败:', error);
        this.clearAuth();
        this.redirectToLogin();
      }
    }
  },
  
  // 判断当前是否在认证页面
  isAuthPage() {
    const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
    const currentPath = window.location.pathname;
    return authPages.some(page => currentPath.startsWith(page));
  },
  
  // 处理登录
  async handleLogin(event) {
    event.preventDefault();
    
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const alertContainer = document.getElementById('login-alert');
    
    try {
      // 显示加载状态
      this.setFormLoading('login-form', true);
      
      // 发送登录请求
      const response = await API.auth.login({
        email: emailInput.value,
        password: passwordInput.value
      });
      
      // 保存认证信息
      this.setAuthData(response.token, response.user);
      
      // 重定向到主页
      this.redirectToHome();
    } catch (error) {
      // 显示错误信息
      this.showAlert(alertContainer, error.message || '登录失败，请检查您的凭据', 'danger');
    } finally {
      // 取消加载状态
      this.setFormLoading('login-form', false);
    }
  },
  
  // 处理注册
  async handleRegister(event) {
    event.preventDefault();
    
    const usernameInput = document.getElementById('register-username');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');
    const alertContainer = document.getElementById('register-alert');
    
    // 验证密码匹配
    if (passwordInput.value !== confirmPasswordInput.value) {
      this.showAlert(alertContainer, '两次输入的密码不匹配', 'danger');
      return;
    }
    
    try {
      // 显示加载状态
      this.setFormLoading('register-form', true);
      
      // 发送注册请求
      const response = await API.auth.register({
        username: usernameInput.value,
        email: emailInput.value,
        password: passwordInput.value
      });
      
      // 保存认证信息
      this.setAuthData(response.token, response.user);
      
      // 重定向到主页
      this.redirectToHome();
    } catch (error) {
      // 显示错误信息
      this.showAlert(alertContainer, error.message || '注册失败，请稍后再试', 'danger');
    } finally {
      // 取消加载状态
      this.setFormLoading('register-form', false);
    }
  },
  
  // 处理忘记密码
  async handleForgotPassword(event) {
    event.preventDefault();
    
    const emailInput = document.getElementById('forgot-email');
    const alertContainer = document.getElementById('forgot-password-alert');
    
    try {
      // 显示加载状态
      this.setFormLoading('forgot-password-form', true);
      
      // 发送忘记密码请求
      const response = await API.auth.forgotPassword(emailInput.value);
      
      // 显示成功信息
      this.showAlert(alertContainer, response.message || '重置密码邮件已发送，请查收', 'success');
      emailInput.value = '';
    } catch (error) {
      // 显示错误信息
      this.showAlert(alertContainer, error.message || '发送重置密码邮件失败，请稍后再试', 'danger');
    } finally {
      // 取消加载状态
      this.setFormLoading('forgot-password-form', false);
    }
  },
  
  // 处理重置密码
  async handleResetPassword(event) {
    event.preventDefault();
    
    const passwordInput = document.getElementById('reset-password');
    const confirmPasswordInput = document.getElementById('reset-confirm-password');
    const alertContainer = document.getElementById('reset-password-alert');
    
    // 获取URL中的令牌
    const token = window.location.pathname.split('/').pop();
    
    // 验证密码匹配
    if (passwordInput.value !== confirmPasswordInput.value) {
      this.showAlert(alertContainer, '两次输入的密码不匹配', 'danger');
      return;
    }
    
    try {
      // 显示加载状态
      this.setFormLoading('reset-password-form', true);
      
      // 发送重置密码请求
      const response = await API.auth.resetPassword(token, passwordInput.value);
      
      // 显示成功信息
      this.showAlert(alertContainer, response.message || '密码已重置，请使用新密码登录', 'success');
      
      // 3秒后重定向到登录页面
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } catch (error) {
      // 显示错误信息
      this.showAlert(alertContainer, error.message || '重置密码失败，请稍后再试', 'danger');
    } finally {
      // 取消加载状态
      this.setFormLoading('reset-password-form', false);
    }
  },
  
  // 处理退出登录
  handleLogout() {
    this.clearAuth();
    this.redirectToLogin();
  },
  
  // 设置认证数据
  setAuthData(token, user) {
    localStorage.setItem('token', token);
    this.setUserData(user);
  },
  
  // 设置用户数据
  setUserData(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },
  
  // 获取用户数据
  getUserData() {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  },
  
  // 清除认证数据
  clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  // 重定向到登录页面
  redirectToLogin() {
    window.location.href = '/login';
  },
  
  // 重定向到主页
  redirectToHome() {
    window.location.href = '/';
  },
  
  // 更新用户界面
  updateUserInterface() {
    const user = this.getUserData();
    if (!user) return;
    
    // 更新用户名显示
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(element => {
      element.textContent = user.username;
    });
    
    // 更新用户头像
    const userAvatarElements = document.querySelectorAll('.user-avatar');
    userAvatarElements.forEach(element => {
      if (user.avatar) {
        element.src = user.avatar;
      } else {
        element.src = '/img/default-avatar.png';
      }
    });
  },
  
  // 设置表单加载状态
  setFormLoading(formId, isLoading) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;
    
    if (isLoading) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 处理中...';
    } else {
      submitBtn.disabled = false;
      submitBtn.innerHTML = submitBtn.getAttribute('data-original-text') || '提交';
    }
  },
  
  // 显示提示信息
  showAlert(container, message, type = 'info