import { View, ActivityIndicator } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

export default function AuthCallback() {
  const { colors } = useAppTheme();
  
  // This screen acts as a dummy receiver for the deep link `yrdlymobile://auth/callback`.
  // As soon as this screen mounts (or even before), the Supabase Auth listener in `use-supabase-auth.tsx`
  // will process the session. Once `user` is populated, `RootNavigationGuard` in `_layout.tsx` 
  // will automatically redirect the user to the correct screen (like `/(tabs)` or onboarding).
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.tint} />
    </View>
  );
}
