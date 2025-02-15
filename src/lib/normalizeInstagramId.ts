// src/utils/normalizeInstagramId.ts

// Normalize Instagram ID (e.g., ensure 17 characters for new accounts)
export function normalizeInstagramId(instagramId: string): string {
    // Example: Pad the ID to ensure it always has 17 characters
    if (instagramId.length === 15) {
      return instagramId.padEnd(17, '0'); // Just an example, adjust as needed
    }
    return instagramId;
  }
  