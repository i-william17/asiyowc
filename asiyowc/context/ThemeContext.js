import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, purpleGoldTheme } from '../theme/colors';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState('system');
  const [currentTheme, setCurrentTheme] = useState(lightTheme);

  useEffect(() => {
    switch (theme) {
      case 'light':
        setCurrentTheme(lightTheme);
        break;
      case 'dark':
        setCurrentTheme(darkTheme);
        break;
      case 'purpleGold':
        setCurrentTheme(purpleGoldTheme);
        break;
      case 'system':
      default:
        setCurrentTheme(systemColorScheme === 'dark' ? darkTheme : lightTheme);
        break;
    }
  }, [theme, systemColorScheme]);

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
  };

  const themeContextValue = React.useMemo(() => ({
    theme: currentTheme,
    themeMode: theme,
    toggleTheme,
    isDark: currentTheme === darkTheme,
  }), [currentTheme, theme]);

  return (
    <ThemeContext.Provider value={themeContextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};