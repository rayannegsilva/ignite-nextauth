import { createContext,  ReactNode, useEffect, useState} from "react";
import Router from 'next/router';
import { api } from "../services/api";
import { setCookie, parseCookies } from 'nookies';

type User = {
  email: string;
  permissions: string[];
  roles: string[];
}

type SignInCredentials = {
  email: string;
  password: string;
}

type AuthProviderProps = {
  children: ReactNode;
}

type AuthContextData = {
  user: User;
  signIn(credentials: SignInCredentials): Promise<void>;
  isAuthentication: boolean;
}

export const AuthContext = createContext({} as AuthContextData);

export function AuthProvider({ children } : AuthProviderProps){
  const [user, setUser] = useState<User>();
  const isAuthentication = !!user;

  useEffect(() => {
    const { 'nextauth.token': token } = parseCookies()

    if(token) {
      api.get('/me').then(response => {
        console.log('entrou aqui token')
        console.log(response)
        // const { email, permissions, roles} = response.data;

        // setUser({
        //   email, 
        //   permissions, 
        //   roles
        // })
      })
    }
  }, []);

 async function signIn({ email, password } : SignInCredentials){
    try {
      const response = await api.post('sessions', { 
        email, 
        password
      })   
      console.log('entrou aqui')
      const { permissions , roles, refreshToken, token } = response.data;

      setCookie(undefined, 'nextauth.token', token, { 
        maxAge: 60 * 60 * 25 * 30, //30 days
        path: '/'
      });
      setCookie(undefined, 'nextauth.refreshToken', refreshToken, { 
        maxAge: 60 * 60 * 25 * 30,
        path: '/'
      });


      setUser({
        email, 
        permissions,
        roles
      })

      api.defaults.headers['Authorization'] = `Bearer ${token}`;

      Router.push('/dashboard');

    } catch (err) {
      console.log(err);
    }  
  }

  return(
    <AuthContext.Provider value={{ signIn, isAuthentication, user }}>
      { children }
    </AuthContext.Provider>
  )
}