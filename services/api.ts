import axios,{ AxiosError }  from 'axios';
import Router from 'next/router';

import { destroyCookie, parseCookies, setCookie } from 'nookies';
import { signOut } from '../context/AuthContext';


let isRefreshing = false;
let failedRequestsQueue = [];

interface AxiosErrorResponse {
  code?: string;
}

export function setupAPIClient(ctx = undefined){
let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: 'http://localhost:3333'
  });
  
  api.defaults.headers.common['Authorization']  = `Bearer ${cookies['nextauth.token']}`;
  
  
  // interceptando uma resposta
  api.interceptors.response.use(response => {
    return response;
  }, (error: AxiosError<AxiosErrorResponse>) => {
    if (error.response.status === 401) {
      if (error.response.data?.code === 'token.expired' ){
          //renovar o token
          cookies = parseCookies(ctx);
  
          const {'nextauth.refreshToken': refreshToken} = cookies;
          const originalConfig = error.config;
  
          if(!isRefreshing) {
            isRefreshing = true;
  
            api.post('/refresh', {
              refreshToken,
            }).then(response => {
              const { token } = response.data;
    
              setCookie(ctx, 'nextauth.token', token, { 
                maxAge: 60 * 60 * 25 * 30, //30 days
                path: '/',
              });
              setCookie(ctx, 'nextauth.refreshToken', response.data.refreshToken, { 
                maxAge: 60 * 60 * 25 * 30,
                path: '/'
              });
    
              api.defaults.headers['Authorization'] = `Bearer ${token}`;
  
              failedRequestsQueue.forEach(request => request.onSuccess(token));
              failedRequestsQueue = [];
            }).catch(err => {
              failedRequestsQueue.forEach(request => request.onFailure(err));
              failedRequestsQueue = [];
  
              if(typeof window !== 'undefined') {
                signOut();
              }
            }).finally(() => {
              isRefreshing = false;
            });
          }
          return new Promise((resolve, reject) => {
            failedRequestsQueue.push({
              onSuccess: (token: string) => {
                originalConfig.headers['Authorization'] = `Bearer ${token}`
  
                resolve(api(originalConfig));
              },
              onFailure: (err: AxiosError) => {
                reject(err);
              },
            })
          });
  
      } else {
        // deslogar o usuário
        if(typeof window !== 'undefined') {
          signOut();
        }
      }
    }
  
    return Promise.reject(error);
  });

  return api;
}