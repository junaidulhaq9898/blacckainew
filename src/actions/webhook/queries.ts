// actions/webhook/queries.ts

import { client } from '@/lib/prisma'

export async function matchKeyword(text: string) {
  try {
    console.log('Matching keyword for text:', text)

    // Find active automations with associated keywords
    const automations = await client.automation.findMany({
      where: {
        active: true,
        keywords: {
          some: {}
        }
      },
      include: {
        keywords: true,
        User: {
          include: {
            integrations: true
          }
        }
      }
    })

    // Loop through automations and match the keyword in the message text
    for (const automation of automations) {
      // Verify integration token is valid
      const integration = automation.User?.integrations[0]
      if (!integration?.token || 
          (integration.expiresAt && new Date(integration.expiresAt) < new Date())) {
        console.log(`Skipping automation ${automation.id} - invalid token`)
        continue
      }

      // Match the message text with keywords
      for (const keyword of automation.keywords) {
        if (text.toLowerCase().includes(keyword.word.toLowerCase())) {
          console.log(`Matched keyword: ${keyword.word} for automation: ${automation.id}`)
          return {
            automationId: automation.id,
            keyword: keyword.word
          }
        }
      }
    }

    console.log('No keyword match found')
    return null
  } catch (error) {
    console.error('Error in matchKeyword:', error)
    return null
  }
}

export async function getKeywordAutomation(id: string, includeToken: boolean) {
  try {
    console.log(`Getting automation: ${id}, includeToken: ${includeToken}`)
    
    // Fetch automation details from the database
    const automation = await client.automation.findUnique({
      where: {
        id,
        active: true
      },
      include: {
        keywords: true,
        trigger: true,
        listener: true,
        User: {
          include: {
            subscription: true,
            integrations: includeToken
          }
        }
      }
    })

    // Return null if no automation found
    if (!automation) {
      console.log(`No automation found for id: ${id}`)
      return null
    }

    return automation
  } catch (error) {
    console.error('Error in getKeywordAutomation:', error)
    return null
  }
}

export async function createChatHistory(
  automationId: string,
  recipientId: string,
  senderId: string,
  message: string
) {
  try {
    console.log('Creating chat history:', {
      automationId,
      recipientId,
      senderId,
      messageLength: message.length
    })

    // Create chat history record to be stored in the database
    return {
      automationId,
      reciever: recipientId,
      senderId,
      message
    }
  } catch (error) {
    console.error('Error in createChatHistory:', error)
    throw error
  }
}

export async function getChatHistory(recipientId: string, senderId: string) {
  try {
    console.log('Getting chat history for:', { recipientId, senderId })

    // Retrieve chat history from the database
    const messages = await client.dms.findMany({
      where: {
        OR: [
          { reciever: recipientId, senderId },
          { reciever: senderId, senderId: recipientId }
        ]
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 10
    })

    // Transform messages into OpenAI format
    const history = messages.map(msg => ({
      role: msg.senderId === recipientId ? 'assistant' : 'user',
      content: msg.message || ''
    }))

    return {
      automationId: messages[0]?.automationId || null,
      history
    }
  } catch (error) {
    console.error('Error in getChatHistory:', error)
    return {
      automationId: null,
      history: []
    }
  }
}

export async function trackResponses(automationId: string, type: 'DM' | 'COMMENT') {
  try {
    console.log(`Tracking ${type} response for automation: ${automationId}`)
    
    // Update response tracking (DM or COMMENT count)
    return await client.listener.update({
      where: {
        automationId
      },
      data: {
        dmCount: type === 'DM' ? { increment: 1 } : undefined,
        commentCount: type === 'COMMENT' ? { increment: 1 } : undefined
      }
    })
  } catch (error) {
    console.error('Error in trackResponses:', error)
    return null
  }
}

export async function getKeywordPost(mediaId: string, automationId: string) {
  try {
    console.log(`Getting post for media: ${mediaId}, automation: ${automationId}`)
    
    // Fetch post data related to a given mediaId and automationId
    return await client.post.findFirst({
      where: {
        postid: mediaId,
        automationId
      }
    })
  } catch (error) {
    console.error('Error in getKeywordPost:', error)
    return null
  }
}

// Utility function to validate Instagram token
export async function validateToken(token: string): Promise<boolean> {
  try {
    const currentTime = new Date()
    const tokenData = await client.integrations.findFirst({
      where: {
        token
      }
    })

    // Check if the token exists and if it's expired
    if (!tokenData || (tokenData.expiresAt && new Date(tokenData.expiresAt) < currentTime)) {
      console.log('[Webhook Debug] Token validation failed:', {
        hasToken: !!tokenData,
        isExpired: tokenData?.expiresAt ? new Date(tokenData.expiresAt) < currentTime : false
      })
      return false
    }

    return true
  } catch (error) {
    console.error('[Webhook Debug] Error validating token:', error)
    return false
  }
}
