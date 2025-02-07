import { client } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { onCurrentUser } from '../user'
import { createIntegration, getIntegration } from './queries'
import { generateTokens } from '@/lib/fetch'
import axios from 'axios'

// Regular expression to check if a string is a valid UUID
const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(str);
}

// Initiates Instagram OAuth flow.
export const onOAuthInstagram = (strategy: 'INSTAGRAM' | 'CRM') => {
  if (strategy === 'INSTAGRAM') {
    // Redirect to Instagram OAuth URL
    return redirect(process.env.INSTAGRAM_EMBEDDED_OAUTH_URL as string)
  }
}

// Handles the callback after Instagram OAuth authorization.
export const onIntegrate = async (code: string) => {
  const user = await onCurrentUser()

  // Log the user.id before Prisma query to check if it's a valid UUID
  console.log("User ID before Prisma query:", user.id);

  // Ensure we have a valid user object and a valid UUID for user.id
  if (!user || !user.id || !isValidUUID(user.id)) {
    console.error('Invalid UUID for user.id:', user?.id);
    return { status: 400, message: 'User not found or invalid user ID' };
  }

  try {
    // Get the user's integrations
    const integration = await getIntegration(user.id)

    if (integration && integration.integrations.length > 0) {
      console.log('Instagram integration already exists.');
      return { status: 200, message: 'Integration already exists' };
    }

    // Generate token using the authorization code
    const token = await generateTokens(code);
    console.log('Generated Token:', token);

    if (token) {
      // Fetch Instagram user ID
      const insta_id = await axios.get(
        `${process.env.INSTAGRAM_BASE_URL}/me?fields=id&access_token=${token.access_token}`
      );
      console.log("Instagram User ID from Instagram API:", insta_id.data.id);

      // Ensure the Instagram ID is valid
      if (!insta_id.data.id) {
        console.error('Invalid Instagram ID');
        return { status: 400, message: 'Invalid Instagram ID' };
      }

      // Set token expiry date
      const expire_date = new Date();
      expire_date.setDate(expire_date.getDate() + 60); // Token expiry date (60 days)

      // Store the integration in the database
      const create = await createIntegration(
        user.id, // Using user.id instead of clerkId
        token.access_token,
        expire_date,
        insta_id.data.id
      );
      console.log('Integration successfully stored in the database:', create);

      // Redirect after successful integration
      return { status: 200, data: create };
    } else {
      console.error('Token generation failed');
      return { status: 401, message: 'Token generation failed' };
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error during integration:', error.message);
      return { status: 500, message: error.message };
    } else {
      console.error('Unknown error during integration');
      return { status: 500, message: 'Unknown error' };
    }
  }
}
