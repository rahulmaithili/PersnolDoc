// Global configuration
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwX82V318Yt-ncpA_dDRmLjB6UILYVhHiVQqa2OVsk9C79V7Eg-bGQbENrK8YT1XwjhPw/exec',
  APP_NAME: 'DocVault',
  VERSION: '1.0.0',
  PAGE_SIZE: 20,
  SEARCH_DEBOUNCE_MS: 300,
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_FILE_TYPES: ['application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ALLOWED_EXTENSIONS: ['.pdf','.jpg','.jpeg','.png','.doc','.docx'],
  MONTHS: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  CATEGORIES: ['College','High School','Intermediate','Land Records','Certificates','Others'],
  TOKEN_KEY: 'dv_token',
  USER_KEY: 'dv_user',
  THEME_KEY: 'dv_theme',
};
