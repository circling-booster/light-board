import axios from 'axios'

export const TOKEN_KEY = 'light-board-token'
export const USER_KEY = 'light-board-user'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const apiGet = async (url, config = {}) => {
  const { data } = await api.get(url, config)
  return data
}

export const apiPost = async (url, body, config = {}) => {
  const { data } = await api.post(url, body, config)
  return data
}

export const apiPut = async (url, body, config = {}) => {
  const { data } = await api.put(url, body, config)
  return data
}

export const apiPatch = async (url, body, config = {}) => {
  const { data } = await api.patch(url, body, config)
  return data
}

export const apiDelete = async (url, config = {}) => {
  const { data } = await api.delete(url, config)
  return data
}
