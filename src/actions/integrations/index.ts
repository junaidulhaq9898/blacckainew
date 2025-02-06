import { redirect } from 'next/navigation'
import { onCurrentUser as importedOnCurrentUser } from '../user' // Renamed import
import { createIntegration, getIntegration, updateIntegration } from '../integrations/queries'
import { generateTokens } from '@/lib/fetch'
import axios from 'axios'

// OAuth initiation
export const onOAuthInstagram = (strategy: 'INSTAGRAM' | 'CRM') => {
  if (strategy === 'INSTAGRAM') {
    return redirect(process.env.INSTAGRAM_EMBEDDED_OAUTH_URL as string)
  }
}

// Integration handler
export const onIntegrate = async (code: string) => {
  const user = await importedOnCurrentUser() // Use renamed import

  if (!user?.id) {
    console.error('User not found')
    return { status: 400, message: 'User not found' }
  }

  try {
    const integration = await getIntegration(user.id)

    // Fixed undefined check
    if (integration?.integrations && integration.integrations.length > 0) {
      console.log('Existing integration found')
      return { status: 200, message: 'Integration exists' }
    }

    const token = await generateTokens(code)
    if (!token) {
      return { status: 401, message: 'Token generation failed' }
    }

    const insta_id = await axios.get(
      `${process.env.INSTAGRAM_BASE_URL}/me?fields=id&access_token=${token.access_token}`
    )

    const expire_date = new Date()
    expire_date.setDate(expire_date.getDate() + 60)

    const create = await createIntegration(
      user.id,
      token.access_token,
      expire_date,
      insta_id.data.id
    )

    return { status: 200, data: create }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Integration error:', message)
    return { status: 500, message }
  }
}

// UUID validation (keep this at bottom)
const isValidUuid = (id: string) => {
  const regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
  return regex.test(id)
}