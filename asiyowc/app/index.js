import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';

export default function Index() {
  const { isAuthenticated } = useSelector(state => state.auth);

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/(auth)/onboarding" />;
  }
}