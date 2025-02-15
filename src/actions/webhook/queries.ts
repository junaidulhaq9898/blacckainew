// actions/webhook/queries.ts

import { client } from '@/lib/prisma'

export async function matchKeyword(text: string) {
  try {
    console.log('[Webhook Debug] Matching keyword for text:', text)
    
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
            integrations: {
              select: {
                token: true,
                expiresAt: true,
                instagramId: true
              }
            }
          }
        }
      }
    })

    console.log('[Webhook Debug] Found automations count:', automations.length)

    for (const automation of automations) {
      // Verify integration token is valid
      const integration = automation.User?.integrations[0]
      console.log('[Webhook Debug] Checking integration:', {
        automationId: automation.id,
        hasToken: !!integration?.token,
        expiresAt: integration?.expiresAt,
        instagramId: integration?.instagramId
      })

      if (!integration?.token || 
          (integration.expiresAt && new Date(integration.expiresAt) < new Date())) {
        console.log(`[Webhook Debug] Skipping automation ${automation.id} - invalid token or expired`)
        continue
      }

      for (const keyword of automation.keywords) {
        console.log('[Webhook Debug] Checking keyword:', {
          keyword: keyword.word,
          against: text,
          automationId: automation.id
        })

        if (text.toLowerCase().includes(keyword.word.toLowerCase())) {
          console.log(`[Webhook Debug] Matched keyword: "${keyword.word}" for automation: ${automation.id}`)
          return {
            automationId: automation.id,
            keyword: keyword.word,
            instagramId: integration.instagramId
          }
        }
      }
    }

    console.log('[Webhook Debug] No keyword match found')
    return null
  } catch (error) {
    console.error('[Webhook Debug] Error in matchKeyword:', error)
    return null
  }
}

export async function getKeywordAutomation(id: string, includeToken: boolean) {
  try {
    console.log(`[Webhook Debug] Getting automation: ${id}, includeToken: ${includeToken}`)
    
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
            integrations: includeToken ? {
              select: {
                token: true,
                expiresAt: true,
                instagramId: true
              }
            } : false
          }
        }
      }
    })

    if (!automation) {
      console.log(`[Webhook Debug] No automation found for id: ${id}`)
      return null
    }

    console.log('[Webhook Debug] Found automation:', {
      id: automation.id,
      hasListener: !!automation.listener,
      hasTriggers: automation.trigger.length > 0,
      hasToken: !!automation.User?.integrations?.[0]?.token
    })

    return automation
  } catch (error) {
    console.error('[Webhook Debug] Error in getKeywordAutomation:', error)
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
    console.log('[Webhook Debug] Creating chat history:', {
      automationId,
      recipientId,
      senderId,
      messageLength: message.length
    })

    // Return data structure for transaction
    return {
      automationId,
      reciever: recipientId,
      senderId,
      message
    }
  } catch (error) {
    console.error('[Webhook Debug] Error in createChatHistory:', error)
    throw error
  }
}

export async function getChatHistory(recipientId: string, senderId: string) {
  try {
    console.log('[Webhook Debug] Getting chat history for:', { recipientId, senderId })

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

    console.log('[Webhook Debug] Found messages count:', messages.length)

    // Transform messages for OpenAI format
    const history = messages.map(msg => ({
      role: msg.senderId === recipientId ? 'assistant' : 'user',
      content: msg.message || ''
    }))

    const result = {
      automationId: messages[0]?.automationId || null,
      history
    }

    console.log('[Webhook Debug] Processed chat history:', {
      hasAutomationId: !!result.automationId,
      messagesCount: result.history.length
    })

    return result
  } catch (error) {
    console.error('[Webhook Debug] Error in getChatHistory:', error)
    return {
      automationId: null,
      history: []
    }
  }
}

export async function trackResponses(automationId: string, type: 'DM' | 'COMMENT') {
  try {
    console.log(`[Webhook Debug] Tracking ${type} response for automation: ${automationId}`)
    
    const result = await client.listener.update({
      where: {
        automationId
      },
      data: {
        dmCount: type === 'DM' ? { increment: 1 } : undefined,
        commentCount: type === 'COMMENT' ? { increment: 1 } : undefined
      }
    })

    console.log('[Webhook Debug] Response tracked:', {
      automationId,
      type,
      newDmCount: result.dmCount,
      newCommentCount: result.commentCount
    })

    return result
  } catch (error) {
    console.error('[Webhook Debug] Error in trackResponses:', error)
    return null
  }
}

export async function getKeywordPost(mediaId: string, automationId: string) {
  try {
    console.log(`[Webhook Debug] Getting post for media: ${mediaId}, automation: ${automationId}`)
    
    const post = await client.post.findFirst({
      where: {
        postid: mediaId,
        automationId
      }
    })

    console.log('[Webhook Debug] Post lookup result:', {
      found: !!post,
      mediaId,
      automationId
    })

    return post
  } catch (error) {
    console.error('[Webhook Debug] Error in getKeywordPost:', error)
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