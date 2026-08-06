import { createStyleSheet, useStyles } from "react-native-unistyles";
import { Redirect } from 'expo-router';
import { View, ActivityIndicator} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/use-supabase-auth';
import { useAppTheme } from '../context/ThemeContext';

export default function Index() {
    const { styles: stylesheet, theme } = useStyles(_stylesheet);

  const { colors } = useAppTheme();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={[stylesheet.container, { backgroundColor: theme.colors.DARK }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return <Redirect href="/(tabs)" />;
}

const _stylesheet = createStyleSheet(theme => ({
      container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
    }));
