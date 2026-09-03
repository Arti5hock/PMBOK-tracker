import axios from 'axios';

// Укажи здесь базовый URL твоего Django-бэкенда. 
// Скорее всего это порт 8000, если ты не менял его в docker-compose.
const API_URL = 'http://localhost:8000/api'; 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор запросов: отрабатывает перед каждым чихом в сторону бэкенда
api.interceptors.request.use(
  (config) => {
    // Достаем токен из хранилища. Убедись, что при логине ты сохраняешь его именно под этим ключом.
    const token = localStorage.getItem('access_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор ответов: ловит отлупы от сервера
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Если сервер вернул 401 Unauthorized — токен протух или невалиден.
      // Здесь позже добавим логику обновления токена (refresh) или редирект на окно логина.
      console.warn('Токен недействителен. Требуется авторизация.');
      // localStorage.removeItem('access_token');
      // window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export default api;