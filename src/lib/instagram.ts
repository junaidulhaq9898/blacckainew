import axios from 'axios'

export const generateTokens = async (code: string) => {
  const params = new URLSearchParams()
  params.append('client_id', process.env.INSTAGRAM_CLIENT_ID!)
  params.append('client_secret', process.env.INSTAGRAM_CLIENT_SECRET!)
  params.append('code', code)
  params.append('grant_type', 'authorization_code')
  params.append('redirect_uri', process.env.INSTAGRAM_REDIRECT_URI!)

  const { data } = await axios.post(
    'https://api.instagram.com/oauth/access_token',
    params
  )

  return {
    access_token: data.access_token,
    expires_in: data.expires_in
  }
}

export const refreshInstagramToken = async (token: string) => {
  const { data } = await axios.get(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`
  )
  
  return {
    access_token: data.access_token,
    expires_in: data.expires_in
  }
}