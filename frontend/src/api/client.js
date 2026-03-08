import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const client = axios.create({
    baseURL: '/api/v1',
    headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach JWT
client.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Response interceptor — auto-refresh on 401
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true
            const refreshToken = useAuthStore.getState().refreshToken
            if (refreshToken) {
                try {
                    const res = await axios.post('/api/v1/auth/refresh', {
                        refresh_token: refreshToken,
                    })
                    const newToken = res.data.access_token
                    useAuthStore.getState().setAccessToken(newToken)
                    original.headers.Authorization = `Bearer ${newToken}`
                    return client(original)
                } catch {
                    useAuthStore.getState().logout()
                }
            } else {
                useAuthStore.getState().logout()
            }
        }
        return Promise.reject(error)
    }
)

export default client
