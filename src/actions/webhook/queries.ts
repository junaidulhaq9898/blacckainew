// actions/webhook/queries.ts

import { client } from '@/lib/prisma'

interface ChatHistory {
  id: string
  createdAt: Date
  automationId: string | null
  senderId: string | null
  reciever: string | null
  message: string | null
}

export async function matchKeyword(text: string) {
  try {
    console.log('Attempting to match keyword:', text)
    const automations = await client.automation.findMany({
      where: {
        active: true,
        keywords: {
          some: {}
        }
      },
      include: {
        keywords: true
      }
    })

    for (const automation of automations) {
      for (const keyword of automation.keywords) {
        if (text.toLowerCase().includes(keyword.word.toLowerCase())) {
          return {
            automationId: automation.id,
            keyword: keyword.word
          }
        }
      }
    }
    return null
  } catch (error) {
    console.error('Error in matchKeyword:', error)
    return null
  }
}

export async function getKeywordAutomation(id: string, includeToken: boolean) {
  try {
    return await client.automation.findUnique({
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
  } catch (error) {
    console.error('Error in getKeywordAutomation:', error)
    return null
  }
}

export async function getKeywordPost(mediaId: string, automationId: string) {
  try {
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

export async function createChatHistory(
  automationId: string,
  recipientId: string,
  senderId: string,
  message: string
) {
  return client.dms.create({
    data: {
      automationId,
      reciever: recipientId,
      senderId,
      message
    }
  })
}

export async function getChatHistory(recipientId: string, senderId: string) {
  try {
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

    // Transform messages into the expected format
    const formattedHistory = messages.map(msg => ({
      role: msg.senderId === recipientId ? 'assistant' : 'user',
      content: msg.message || ''
    }))

    return {
      automationId: messages[0]?.automationId || null,
      history: formattedHistory
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