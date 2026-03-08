import { create } from 'zustand'
import client from '../api/client'

// Rehydrate from sessionStorage on module load
const stored = (() => {
    try {
        const s = sessionStorage.getItem('asd_auth')
        return s ? JSON.parse(s) : null
    } catch { return null }
})()

const _save = (user, accessToken, refreshToken) => {
    try { sessionStorage.setItem('asd_auth', JSON.stringify({ user, accessToken, refreshToken })) } catch {}
}

const _clear = () => {
    try { sessionStorage.removeItem('asd_auth') } catch {}
}

export const useAuthStore = create((set, get) => ({
    user: stored?.user || null,
    accessToken: stored?.accessToken || null,
    refreshToken: stored?.refreshToken || null,

    setAccessToken: (token) => {
        set({ accessToken: token })
        const { user, refreshToken } = get()
        _save(user, token, refreshToken)
    },

    login: async (email, password) => {
        const res = await client.post('/auth/login', { email, password })
        const { access_token, refresh_token, user } = res.data
        set({ user, accessToken: access_token, refreshToken: refresh_token })
        _save(user, access_token, refresh_token)
        return user
    },

    register: async (name, email, password, confirmPassword, role) => {
        const res = await client.post('/auth/register', {
            name, email, password, confirm_password: confirmPassword, role,
        })
        const { access_token, refresh_token, user } = res.data
        set({ user, accessToken: access_token, refreshToken: refresh_token })
        _save(user, access_token, refresh_token)
        return user
    },

    logout: () => {
        set({ user: null, accessToken: null, refreshToken: null })
        _clear()
    },

    refresh: async () => {
        const rt = get().refreshToken
        if (!rt) return
        try {
            const res = await client.post('/auth/refresh', { refresh_token: rt })
            const newToken = res.data.access_token
            set({ accessToken: newToken })
            const { user, refreshToken } = get()
            _save(user, newToken, refreshToken)
        } catch {
            get().logout()
        }
    },
}))
