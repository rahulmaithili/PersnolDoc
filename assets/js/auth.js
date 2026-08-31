// Authentication Logic

function checkAuth() {
  if (!getToken()) {
    window.location.href = 'index.html';
  }
}

async function login(email, password) {
  if (!email || !password) {
    showToast('warning', 'Validation', 'Email and password are required');
    return;
  }
  
  showLoading('Logging in...');
  const response = await apiRequest('login', { email, password }, 'POST');
  hideLoading();
  
  if (response.success && response.data) {
    setToken(response.data.token);
    setUser(response.data.user);
    showToast('success', 'Welcome!', `Hello, ${response.data.user.name}`);
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  } else {
    showToast('error', 'Login Failed', response.message || 'Invalid credentials');
  }
}

async function logout() {
  if (typeof Swal !== 'undefined') {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You will be logged out of your session.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, log me out!'
    });
    
    if (result.isConfirmed) {
      performLogout();
    }
  } else {
    if (confirm('Are you sure you want to log out?')) {
      performLogout();
    }
  }
}

async function performLogout() {
  showLoading('Logging out...');
  await apiRequest('logout', {}, 'POST');
  hideLoading();
  clearToken();
  clearUser();
  window.location.href = 'index.html';
}

async function forgotPassword(email) {
  if (!email) {
    showToast('warning', 'Validation', 'Email is required');
    return;
  }
  
  showLoading('Sending reset link...');
  const response = await apiRequest('forgotPassword', { email }, 'POST');
  hideLoading();
  
  if (response.success) {
    showToast('success', 'Success', 'Password reset instructions sent to your email.');
  }
}

async function resetPassword(token, newPassword, confirmPassword) {
  if (newPassword !== confirmPassword) {
    showToast('warning', 'Validation', 'Passwords do not match');
    return;
  }
  if (newPassword.length < 8) {
    showToast('warning', 'Validation', 'Password must be at least 8 characters');
    return;
  }
  
  showLoading('Resetting password...');
  const response = await apiRequest('resetPassword', { token, newPassword }, 'POST');
  hideLoading();
  
  if (response.success) {
    showToast('success', 'Success', 'Password has been reset successfully.');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
  }
}

async function getProfile() {
  const response = await apiRequest('getProfile', {}, 'GET');
  if (response.success) {
    return response.profile;
  }
  return null;
}

async function updateProfile(name) {
  showLoading('Updating profile...');
  const response = await apiRequest('updateProfile', { name }, 'POST');
  hideLoading();
  
  if (response.success) {
    const user = getUser();
    if (user) {
      user.name = name;
      setUser(user);
      initUserAvatar();
    }
    showToast('success', 'Success', 'Profile updated successfully');
  }
}

async function changePassword(currentPassword, newPassword) {
  showLoading('Changing password...');
  const response = await apiRequest('changePassword', { currentPassword, newPassword }, 'POST');
  hideLoading();
  
  if (response.success) {
    showToast('success', 'Success', 'Password changed successfully');
  }
}

function initUserAvatar() {
  const user = getUser();
  if (user) {
    const nameEls = document.querySelectorAll('.user-name-display');
    nameEls.forEach(el => el.textContent = user.name || 'User');
    
    const avatarEls = document.querySelectorAll('.user-avatar-img');
    avatarEls.forEach(el => {
      if (user.avatarUrl) {
        el.src = user.avatarUrl;
      } else {
        // Generate initial avatar
        const initial = (user.name || 'U').charAt(0).toUpperCase();
        el.src = `https://ui-avatars.com/api/?name=${initial}&background=4361ee&color=fff`;
      }
    });
  }
}

// Handle login page specific logic
document.addEventListener('DOMContentLoaded', () => {
  const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
  if (isLoginPage && getToken()) {
    window.location.href = 'dashboard.html';
  }
  
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      login(email, password);
    });
  }
});
