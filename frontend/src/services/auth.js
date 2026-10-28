import api, { tokenStore } from './api'

export const authService = {
  // POST /auth/login {email,password} -> {access_token, token_type}
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password }, { skipAuthRedirect: true })
    tokenStore.set(data.access_token)
    return data
  },
  // GET /auth/me -> {id,name,email,role,is_active}
  me: () => api.get('/auth/me').then((r) => r.data),
  // Backend has no logout endpoint (stateless JWT): logout = discard the token client-side.
  logout: () => tokenStore.clear(),
}
