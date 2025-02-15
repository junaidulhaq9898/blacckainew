// hooks/use-automations.ts

import { z } from 'zod'
import {
  createAutomations,
  deleteKeyword,
  saveKeyword,
  saveListener,
  savePosts,
  saveTrigger,
  updateAutomationName,
} from '@/actions/automations'
import { useMutationData } from './use-mutation-data'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import useZodForm from './use-zod-form'
import { AppDispatch, useAppSelector } from '@/redux/store'
import { useDispatch } from 'react-redux'
import { TRIGGER } from '@/redux/slices/automation'

// Create Automation Hook
export const useCreateAutomation = (id?: string) => {
  const { isPending, mutate } = useMutationData(
    ['create-automation'],
    () => {
      console.log('Creating automation:', { id })
      return createAutomations(id)
    },
    'user-automations'
  )

  return { isPending, mutate }
}

// Edit Automation Hook
export const useEditAutomation = (automationId: string) => {
  const [edit, setEdit] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  
  const enableEdit = () => {
    console.log('Enabling edit mode for automation:', automationId)
    setEdit(true)
  }
  
  const disableEdit = () => {
    console.log('Disabling edit mode for automation:', automationId)
    setEdit(false)
  }

  const { isPending, mutate } = useMutationData(
    ['update-automation'],
    (data: { name: string }) => {
      console.log('Updating automation name:', { automationId, name: data.name })
      return updateAutomationName(automationId, { name: data.name })
    },
    'automation-info',
    disableEdit
  )

  useEffect(() => {
    function handleClickOutside(this: Document, event: MouseEvent) {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node | null)
      ) {
        if (inputRef.current.value !== '') {
          console.log('Saving automation name on click outside:', inputRef.current.value)
          mutate({ name: inputRef.current.value })
        } else {
          disableEdit()
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mutate])

  return {
    edit,
    enableEdit,
    disableEdit,
    inputRef,
    isPending,
  }
}

// Listener Hook
export const useListener = (id: string) => {
  const [listener, setListener] = useState<'MESSAGE' | 'SMARTAI' | null>(null)

  const promptSchema = z.object({
    prompt: z.string().min(1),
    reply: z.string(),
  })

  const { isPending, mutate } = useMutationData(
    ['create-lister'],
    (data: { prompt: string; reply: string }) => {
      console.log('Saving listener:', { id, type: listener, data })
      return saveListener(id, listener || 'MESSAGE', data.prompt, data.reply)
    },
    'automation-info'
  )

  const { errors, onFormSubmit, register, reset, watch } = useZodForm(
    promptSchema,
    mutate
  )

  const onSetListener = (type: 'SMARTAI' | 'MESSAGE') => {
    console.log('Setting listener type:', { id, type })
    setListener(type)
  }

  return { onSetListener, register, onFormSubmit, listener, isPending }
}

// Triggers Hook
export const useTriggers = (id: string) => {
  const types = useAppSelector((state) => state.AutmationReducer.trigger?.types)
  const dispatch: AppDispatch = useDispatch()

  const onSetTrigger = (type: 'COMMENT' | 'DM') => {
    console.log('Setting trigger:', { id, type })
    dispatch(TRIGGER({ trigger: { type } }))
  }

  const { isPending, mutate } = useMutationData(
    ['add-trigger'],
    (data: { types: string[] }) => {
      console.log('Saving triggers:', { id, types: data.types })
      return saveTrigger(id, data.types)
    },
    'automation-info'
  )

  const onSaveTrigger = () => {
    if (!types || types.length === 0) {
      console.warn('Attempted to save triggers with no types selected')
      return
    }
    mutate({ types })
  }

  return { types, onSetTrigger, onSaveTrigger, isPending }
}

// Keywords Hook
export const useKeywords = (id: string) => {
  const [keyword, setKeyword] = useState('')

  const onValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value)
  }

  const { mutate } = useMutationData(
    ['add-keyword'],
    (data: { keyword: string }) => {
      console.log('Adding keyword:', { id, keyword: data.keyword })
      return saveKeyword(id, data.keyword)
    },
    'automation-info',
    () => setKeyword('')
  )

  const onKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && keyword.trim()) {
      console.log('Adding keyword on Enter:', { id, keyword })
      mutate({ keyword })
      setKeyword('')
    }
  }

  const { mutate: deleteMutation } = useMutationData(
    ['delete-keyword'],
    (data: { id: string }) => {
      console.log('Deleting keyword:', { automationId: id, keywordId: data.id })
      return deleteKeyword(data.id)
    },
    'automation-info'
  )

  return { keyword, onValueChange, onKeyPress, deleteMutation }
}

// Posts Hook
export const useAutomationPosts = (id: string) => {
  const [posts, setPosts] = useState<
    {
      postid: string
      caption?: string
      media: string
      mediaType: 'IMAGE' | 'VIDEO' | 'CAROSEL_ALBUM'
    }[]
  >([])

  const onSelectPost = (post: {
    postid: string
    caption?: string
    media: string
    mediaType: 'IMAGE' | 'VIDEO' | 'CAROSEL_ALBUM'
  }) => {
    console.log('Toggling post selection:', { id, postId: post.postid })
    setPosts((prevItems) => {
      if (prevItems.find((p) => p.postid === post.postid)) {
        return prevItems.filter((item) => item.postid !== post.postid)
      } else {
        return [...prevItems, post]
      }
    })
  }

  const { mutate, isPending } = useMutationData(
    ['attach-posts'],
    () => {
      console.log('Saving posts:', { id, postCount: posts.length })
      return savePosts(id, posts)
    },
    'automation-info',
    () => setPosts([])
  )

  return { posts, onSelectPost, mutate, isPending }
}