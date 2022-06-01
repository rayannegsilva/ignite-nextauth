import axios,{ AxiosError }  from 'axios';

import { parseCookies, setCookie } from 'nookies';

let cookies = parseCookies();
let isRefreshing = false;
let failedRequestsQueue = [];

interface AxiosErrorResponse {
  code?: string;
}

export const api = axios.create({
  baseURL: 'http://localhost:3333'
});

api.defaults.headers.common['Authorization']  = `Bearer ${cookies['nextauth.token']}`;



api.interceptors.response.use(response => {
  return response;
}, (error: AxiosError<AxiosErrorResponse>) => {
  if (error.response.status === 401) {
    if (error.response.data?.code === 'token.expired' ){
        //renovar o token
        cookies = parseCookies();

        const {'nextauth.refreshToken': refreshToken} = cookies;
        const originalConfig = error.config;

        if(!isRefreshing) {
          isRefreshing = true;

          api.post('/refresh', {
            refreshToken,
          }).then(response => {
            const { token } = response.data;
  
            setCookie(undefined, 'nextauth.token', token, { 
              maxAge: 60 * 60 * 25 * 30, //30 days
              path: '/',
            });
            setCookie(undefined, 'nextauth.refreshToken', response.data.refreshToken, { 
              maxAge: 60 * 60 * 25 * 30,
              path: '/'
            });
  
            api.defaults.headers['Authorization'] = `Bearer ${token}`;

            failedRequestsQueue.forEach(request => request.onSuccess(token));
            failedRequestsQueue = [];
          }).catch(err => {
            failedRequestsQueue.forEach(request => request.onFailure(err));
            failedRequestsQueue = [];
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
    }
  }
})

// api.interceptors.response.use(response => {

//   return response;
 
// }, (error: AxiosError<AxiosErrorResponse>) => {
//   if(error.response.status === 401) {
//     if(error.response.data?.code === 'token.expired') {
//       console.log('entrou aqui');
//       cookies = parseCookies();

//       const { 'nextauth.refreshToken': refreshToken } = cookies;
//       //const originalConfig = error.config;

//     //  if(!!isRefreshing){
//     //    isRefreshing = true;

//        api.post('/refresh', {
//         refreshToken,
        
//       }).then(response => {
//         const { token }= response.data;
//         console.log('entrou aqui refresh');

//         setCookie(undefined, 'nextauth.token', token, { 
//           maxAge: 60 * 60 * 25 * 30,
//           path: '/'
//         });
//         setCookie(undefined, 'nextauth.refreshToken', response.data.refreshToken, { 
//           maxAge: 60 * 60 * 25 * 30,
//           path: '/'
//         })

//         api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

//         // failedRequestsQueue.forEach(request => request.onSuccess(token))
//         // failedRequestsQueue = [];
      
//       })
//       // .catch(err => {
//       //   failedRequestsQueue.forEach(request => request.onFailure(err))
//       //   failedRequestsQueue = [];
//       // })
//       // .finally(() => {
//       //   isRefreshing = false;
//       // });
//      }

//     //  return new Promise((resolve, reject) => {
//     //   failedRequestsQueue.push({
//     //     onSuccess:(token: string)=> {
//     //       originalConfig.headers['Authorization'] = `Bearer ${token}`
//     //       resolve(api(originalConfig))
//     //     },
//     //     onFailure: (err: AxiosError) => {
//     //       reject(err)
//     //     },
//     //   })
//     //  })
//     } else {
//       // deslogar usuário
//     }
//   }
// )