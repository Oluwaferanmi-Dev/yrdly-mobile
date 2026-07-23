import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function InviteRedirect() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      // Redirect an invite link straight to the profile page
      router.replace(`/profile/${id}` as any);
    } else {
      router.replace('/');
    }
  }, [id]);

  return null;
}
