import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setToken, resetAuth } from '../store/slices/authSlice';
import { secureStore } from '../services/storage';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'RESTORE_TOKEN':
      return {
        ...state,
        userToken: action.token,
        isLoading: false,
      };
    case 'SIGN_IN':
      return {
        ...state,
        isSignout: false,
        userToken: action.token,
      };
    case 'SIGN_OUT':
      return {
        ...state,
        isSignout: true,
        userToken: null,
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    isLoading: true,
    isSignout: false,
    userToken: null,
  });

  const reduxDispatch = useDispatch();
  const authState = useSelector(state => state.auth);

  useEffect(() => {
    // Check for stored token on app start
    const bootstrapAsync = async () => {
      let userToken;

      try {
        userToken = await secureStore.getItem('token');
        if (userToken) {
          reduxDispatch(setToken(userToken));
        }
      } catch (e) {
        console.warn('Failed to restore token:', e);
      }

      dispatch({ type: 'RESTORE_TOKEN', token: userToken });
    };

    bootstrapAsync();
  }, []);

  const authContext = React.useMemo(() => ({
    signIn: async (token) => {
      await secureStore.setItem('token', token);
      reduxDispatch(setToken(token));
      dispatch({ type: 'SIGN_IN', token });
    },
    signOut: async () => {
      await secureStore.removeItem('token');
      reduxDispatch(resetAuth());
      dispatch({ type: 'SIGN_OUT' });
    },
    signUp: async (token) => {
      await secureStore.setItem('token', token);
      reduxDispatch(setToken(token));
      dispatch({ type: 'SIGN_IN', token });
    },
  }), []);

  return (
    <AuthContext.Provider value={{ ...authContext, state }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};