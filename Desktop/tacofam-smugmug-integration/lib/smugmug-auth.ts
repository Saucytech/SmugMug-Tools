import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { getSmugMugTokens } from './smugmug-tokens';

export async function requireSmugMugTokens() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const tokens = await getSmugMugTokens(session.user.id);
  if (!tokens) {
    throw new Error('SmugMug account not connected');
  }

  return {
    userId: session.user.id,
    ...tokens,
  };
}
