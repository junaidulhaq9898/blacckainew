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

// Validation schemas
const automationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  active: z.boolean().optional()
});

const listenerSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  reply: z.string().optional()
});

// Hook for creating automation
export const useCreateAutomation = (id?: string) => {
  const { isPending, mutate } = useMutationData(
    ['create-automation'],
    async () => {
      try {
        console.log('Creating automation:', { id });
        const result = await createAutomations(id);
        if (result.status !== 200) {
          throw new Error(result.data);
        }
        return result;
      } catch (error: any) {
        console.error('Automation creation error:', error);
        throw new Error(error.message || 'Failed to create automation');
      }
    },
    'user-automations'
  );

  return { isPending, mutate };
};

// Hook for editing automation
export const useEditAutomation = (automationId: string) => {
  const [edit, setEdit] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const enableEdit = () => {
    console.log('Enabling edit mode for automation:', automationId);
    setEdit(true);
  };

  const disableEdit = () => {
    console.log('Disabling edit mode for automation:', automationId);
    setEdit(false);
  };

  const { isPending, mutate } = useMutationData(
    ['update-automation'],
    async (data: { name: string }) => {
      try {
        console.log('Updating automation name:', { automationId, name: data.name });
        const result = await updateAutomationName(automationId, { name: data.name });
        if (result.status !== 200) {
          throw new Error(result.data);
        }
        return result;
      } catch (error: any) {
        console.error('Automation update error:', error);
        throw new Error(error.message || 'Failed to update automation');
      }
    },
    'automation-info',
    disableEdit
  );

  useEffect(() => {
    function handleClickOutside(this: Document, event: MouseEvent) {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node | null)
      ) {
        if (inputRef.current.value.trim() !== '') {
          console.log('Saving automation name on click outside:', inputRef.current.value);
          mutate({ name: inputRef.current.value });
        } else {
          disableEdit();
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mutate]);

  return {
    edit,
    enableEdit,
    disableEdit,
    inputRef,
    isPending,
  };
};

// Hook for managing listener
export const useListener = (id: string) => {
  const [listener, setListener] = useState<'MESSAGE' | 'SMARTAI' | null>(null);

  const { isPending, mutate } = useMutationData(
    ['create-listener'],
    async (data: { prompt: string; reply: string }) => {
      try {
        console.log('Saving listener:', { id, type: listener, data });
        const result = await saveListener(id, listener || 'MESSAGE', data.prompt, data.reply);
        if (result.status !== 200) {
          throw new Error(result.data);
        }
        return result;
      } catch (error: any) {
        console.error('Listener creation error:', error);
        throw new Error(error.message || 'Failed to create listener');
      }
    },
    'automation-info'
  );

  const { errors, onFormSubmit, register, reset, watch } = useZodForm(
    listenerSchema,
    mutate
  );

  const onSetListener = (type: 'SMARTAI' | 'MESSAGE') => {
    console.log('Setting listener type:', { id, type });
    setListener(type);
  };

  return { onSetListener, register, onFormSubmit, listener, isPending, errors };
};

// Hook for managing triggers
export const useTriggers = (id: string) => {
  const types = useAppSelector((state) => state.AutmationReducer.trigger?.types);
  const dispatch: AppDispatch = useDispatch();

  const onSetTrigger = (type: 'COMMENT' | 'DM') => {
    console.log('Setting trigger:', { id, type });
    dispatch(TRIGGER({ trigger: { type } }));
  };

  const { isPending, mutate } = useMutationData(
    ['add-trigger'],
    async (data: { types: string[] }) => {
      try {
        console.log('Saving triggers:', { id, types: data.types });
        const result = await saveTrigger(id, data.types);
        if (result.status !== 200) {
          throw new Error(result.data);
        }
        return result;
      } catch (error: any) {
        console.error('Trigger creation error:', error);
        throw new Error(error.message || 'Failed to save trigger');
      }
    },
    'automation-info'
  );

  const onSaveTrigger = () => {
    if (!types || types.length === 0) {
      console.warn('Attempted to save triggers with no types selected');
      return;
    }
    mutate({ types });
  };

  return { types, onSetTrigger, onSaveTrigger, isPending };
};

// Hook for managing keywords
export const useKeywords = (id: string) => {
  const [keyword, setKeyword] = useState('');

  const onValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  };

  const { mutate } = useMutationData(
    ['add-keyword'],
    async (data: { keyword: string }) => {
      try {
        console.log('Adding keyword:', { id, keyword: data.keyword });
        const result = await saveKeyword(id, data.keyword);
        if (result.status !== 200) {
          throw new Error(result.data);
        }
        return result;
      } catch (error: any) {
        console.error('Keyword creation error:', error);
        throw new Error(error.message || 'Failed to add keyword');
      }
    },
    'automation-info',
    () => setKeyword('')
  );

  const onKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && keyword.trim()) {
      console.log('Adding keyword on Enter:', { id, keyword });
      mutate({ keyword });
      setKeyword('');
    }
  };

  const { mutate: deleteMutation } = useMutationData(
    ['delete-keyword'],
    async (data: { id: string }) => {
      try {
        console.log('Deleting keyword:', { automationId: id, keywordId: data.id });
        const result = await deleteKeyword(data.id);
        if (result.status !== 200) {
          throw new Error(result.data);
        }
        return result;
      } catch (error: any) {
        console.error('Keyword deletion error:', error);
        throw new Error(error.message || 'Failed to delete keyword');
      }
    },
    'automation-info'
  );

  return { keyword, onValueChange, onKeyPress, deleteMutation };
};

// Hook for managing automation posts
export const useAutomationPosts = (id: string) => {
  const [posts, setPosts] = useState<{
    postid: string;
    caption?: string;
    media: string;
    mediaType: 'IMAGE' | 'VIDEO' | 'CAROSEL_ALBUM';
  }[]>([]);

  const onSelectPost = (post: {
    postid: string;
    caption?: string;
    media: string;
    mediaType: 'IMAGE' | 'VIDEO' | 'CAROSEL_ALBUM';
  }) => {
    console.log('Toggling post selection:', { id, postId: post.postid });
    setPosts((prevItems) => {
      if (prevItems.find((p) => p.postid === post.postid)) {
        return prevItems.filter((item) => item.postid !== post.postid);
      } else {
        return [...prevItems, post];
      }
    });
  };

  const { mutate, isPending } = useMutationData(
    ['attach-posts'],
    async () => {
      try {
        console.log('Saving posts:', { id, postCount: posts.length });
        const result = await savePosts(id, posts);
        if (result.status !== 200) {
          throw new Error(result.data);
        }
        return result;
      } catch (error: any) {
        console.error('Post attachment error:', error);
        throw new Error(error.message || 'Failed to attach posts');
      }
    },
    'automation-info',
    () => setPosts([])
  );

  return { posts, onSelectPost, mutate, isPending };
};