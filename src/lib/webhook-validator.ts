// Types for webhook payloads
export interface WebhookPayload {
  entry: Array<{
    id: string
    time: number
    messaging?: Array<MessagingEvent>
    changes?: Array<ChangeEvent>
  }>
  object: string
}

interface MessagingEvent {
  sender: {
    id: string
  }
  recipient: {
    id: string
  }
  timestamp: number
  message?: {
    mid: string
    text: string
    quick_reply?: {
      payload: string
    }
  }
  read?: {
    watermark: number
  }
  postback?: {
    title: string
    payload: string
  }
}

interface ChangeEvent {
  field: string
  value: {
    id: string
    from: {
      id: string
      name?: string
    }
    post_id?: string
    comment_id?: string
    message?: string
    text?: string
    media?: {
      id: string
      media_type: string
      media_url: string
    }
    created_time: number
  }
}

export class WebhookValidator {
  // Cache for rate limiting - now properly typed as static class property
  private static rateLimitCache: Map<string, { count: number; timestamp: number }> = new Map();
  
  private validateMessaging(messaging: any): boolean {
    if (!Array.isArray(messaging)) return false;
    if (messaging.length === 0) return true;

    return messaging.every(msg => {
      // Basic structure validation
      if (!msg?.sender?.id || !msg?.recipient?.id) {
        return false;
      }

      // Message content validation
      if (msg.message) {
        if (typeof msg.message.text !== 'string') {
          return false;
        }
      }

      // Read receipt validation
      if (msg.read) {
        if (typeof msg.read.watermark !== 'number') {
          return false;
        }
      }

      // Postback validation
      if (msg.postback) {
        if (typeof msg.postback.payload !== 'string') {
          return false;
        }
      }

      return true;
    });
  }

  private validateChanges(changes: any): boolean {
    if (!Array.isArray(changes)) return false;
    if (changes.length === 0) return true;

    return changes.every(change => {
      // Basic field validation
      if (typeof change?.field !== 'string') {
        return false;
      }

      const value = change.value;
      if (!value?.id || !value?.from?.id) {
        return false;
      }

      // Validate based on change type
      switch (change.field) {
        case 'comments':
          return this.validateCommentChange(value);
        case 'mentions':
          return this.validateMentionChange(value);
        case 'story_mentions':
          return this.validateStoryMentionChange(value);
        default:
          return false;
      }
    });
  }

  private validateCommentChange(value: any): boolean {
    return (
      typeof value.comment_id === 'string' &&
      typeof value.message === 'string' &&
      typeof value.created_time === 'number'
    );
  }

  private validateMentionChange(value: any): boolean {
    return (
      typeof value.media?.id === 'string' &&
      typeof value.media?.media_type === 'string' &&
      typeof value.created_time === 'number'
    );
  }

  private validateStoryMentionChange(value: any): boolean {
    return (
      typeof value.media?.id === 'string' &&
      typeof value.media?.media_type === 'string' &&
      value.media?.media_type === 'STORY'
    );
  }

  // Fixed rate limiting check with proper static property access
  private checkRateLimit(senderId: string): boolean {
    const now = Date.now();
    const limit = 100; // messages per hour
    const windowMs = 60 * 60 * 1000; // 1 hour

    // Access static property directly through class reference
    const current = WebhookValidator.rateLimitCache.get(senderId) || {
      count: 0,
      timestamp: now
    };

    // Reset if window has passed
    if (now - current.timestamp > windowMs) {
      current.count = 0;
      current.timestamp = now;
    }

    // Check limit
    if (current.count >= limit) {
      return false;
    }

    // Update counter
    current.count++;
    WebhookValidator.rateLimitCache.set(senderId, current);

    return true;
  }

  public async validatePayload(
    payload: any,
    token: string
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Basic structure validation
      if (!payload || typeof payload !== 'object') {
        return { isValid: false, error: 'Invalid payload structure' };
      }

      if (!Array.isArray(payload.entry) || payload.entry.length === 0) {
        return { isValid: false, error: 'Invalid entry array' };
      }

      // Validate each entry
      for (const entry of payload.entry) {
        // Basic entry validation
        if (typeof entry.id !== 'string') {
          return { isValid: false, error: 'Invalid entry ID' };
        }

        // Validate messaging events
        if (entry.messaging && !this.validateMessaging(entry.messaging)) {
          return { isValid: false, error: 'Invalid messaging format' };
        }

        // Validate changes
        if (entry.changes && !this.validateChanges(entry.changes)) {
          return { isValid: false, error: 'Invalid changes format' };
        }

        // Check rate limit for messaging events
        if (entry.messaging?.[0]?.sender?.id) {
          if (!this.checkRateLimit(entry.messaging[0].sender.id)) {
            return { isValid: false, error: 'Rate limit exceeded' };
          }
        }
      }

      return { isValid: true };
    } catch (error) {
      console.error('Webhook validation error:', error);
      return { isValid: false, error: 'Validation failed' };
    }
  }
}

export const webhookValidator = new WebhookValidator();