import { client } from './src/lib/prisma';

async function testUpdate() {
  try {
    const updated = await client.subscription.update({
      where: { userId: 'dee8b620-e18a-4519-bad7-683574e54967' },
      data: { 
        plan: 'PRO',
        updatedAt: new Date()
      },
    });
    console.log('Update worked:', updated);
  } catch (error) {
    console.error('Update failed:', error);
  } finally {
    await client.$disconnect(); // Close the connection
  }
}

testUpdate();