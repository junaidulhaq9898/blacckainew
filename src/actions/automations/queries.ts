// src/actions/automations/queries.ts
import { client } from '@/lib/prisma'
import { v4 } from 'uuid'

// Create automation
export const createAutomation = async (clerkId: string, id?: string) => {
  return await client.user.update({
    where: { clerkId },
    data: {
      automations: {
        create: {
          ...(id && { id }),
        },
      },
    },
  })
}

// Get automations
export const getAutomations = async (clerkId: string) => {
  return await client.user.findUnique({
    where: { clerkId },
    select: {
      automations: {
        orderBy: { createdAt: 'asc' },
        include: {
          keywords: true,
          listener: true,
        },
      },
    },
  })
}

// Find automation
export const findAutomation = async (id: string) => {
  return await client.automation.findUnique({
    where: { id },
    include: {
      keywords: true,
      trigger: true,
      posts: true,
      listener: true,
      User: {
        select: {
          subscription: true,
          integrations: true,
        },
      },
    },
  })
}

// Update automation
export const updateAutomation = async (
  id: string,
  update: { name?: string; active?: boolean }
) => {
  return await client.automation.update({
    where: { id },
    data: { name: update.name, active: update.active },
  })
}

// Add listener
export const addListener = async (
  automationId: string,
  listener: 'SMARTAI' | 'MESSAGE',
  prompt: string,
  reply?: string
) => {
  return await client.automation.update({
    where: { id: automationId },
    data: {
      listener: {
        create: {
          listener,
          prompt,
          commentReply: reply,
        },
      },
    },
  })
}

// Add trigger
export const addTrigger = async (automationId: string, trigger: string[]) => {
  if (trigger.length === 2) {
    return await client.automation.update({
      where: { id: automationId },
      data: {
        trigger: {
          createMany: {
            data: [{ type: trigger[0] }, { type: trigger[1] }],
          },
        },
      },
    })
  }
  return await client.automation.update({
    where: { id: automationId },
    data: {
      trigger: {
        create: { type: trigger[0] },
      },
    },
  })
}

// Add keyword
export const addKeyWord = async (automationId: string, keyword: string) => {
  return client.automation.update({
    where: { id: automationId },
    data: {
      keywords: {
        create: { word: keyword },
      },
    },
  })
}

// Delete keyword query
export const deleteKeywordQuery = async (id: string) => {
  return client.keyword.delete({
    where: { id },
  })
}

// Add post
export const addPost = async (
  autmationId: string,
  posts: {
    postid: string
    caption?: string
    media: string
    mediaType: 'IMAGE' | 'VIDEO' | 'CAROSEL_ALBUM'
  }[]
) => {
  return await client.automation.update({
    where: { id: autmationId },
    data: {
      posts: {
        createMany: {
          data: posts,
        },
      },
    },
  })
}

