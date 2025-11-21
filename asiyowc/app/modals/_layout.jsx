import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create-post" options={{ presentation: 'modal' }} />
      <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
      <Stack.Screen name="profile-edit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="sos-help" options={{ presentation: 'modal' }} />
    </Stack>
  );
}