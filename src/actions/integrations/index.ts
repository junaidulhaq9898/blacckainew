'use server'
import { client } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { onCurrentUser } from '../user'
import { createIntegration, getIntegration } from './queries'
import { generateTokens } from '@/lib/fetch'
import axios from 'axios'
import { revalidatePath } from 'next/cache'

export const onOAuthInstagram = (strategy: 'INSTAGRAM' | 'CRM') => {
  if (strategy !== 'INSTAGRAM') throw new Error('Invalid integration strategy')
  
  const oauthUrl = process.env.INSTAGRAM_EMBEDDED_OAUTH_URL
  if (!oauthUrl) throw new Error('Instagram OAuth URL not configured')
  
  return redirect(oauthUrl)
}

export const onIntegrate = async (code: string) => {
  try {
    const user = await onCurrentUser()
    if (!user?.id) throw new Error('User not authenticated')

    const existing = await getIntegration(user.id)
    if (existing?.integrations?.length) {
      revalidatePath('/integrations')
      return { success: 'Integration exists' }
    }

    const token = await generateTokens(code)
    if (!token?.access_token) throw new Error('Failed to get access token')

    const { data } = await axios.get<{ id: string }>(
      `${process.env.INSTAGRAM_BASE_URL}/me`,
      { params: { fields: 'id', access_token: token.access_token } }
    )

    const expireDate = new Date()
    expireDate.setDate(expireDate.getDate() + 60)

    const integrationResult = await createIntegration({
      userId: user.id,
      token: token.access_token,
      expire: expireDate,
      instagramId: data.id
    })

    revalidatePath('/integrations')
    return { 
      success: true,
      data: {
        name: [integrationResult.firstname, integrationResult.lastname]
          .filter(Boolean).join(' ')
      }
    }
    
  } catch (error: any) {
    console.error('Integration failed:', error)
    return {
      error: error.response?.data?.message || 
      error.message || 
      'Failed to complete Instagram integration'
    }
  }
}