import {create} from 'zustand';
import Cookies from 'js-cookie';

import {User, AuthData} from '@/types';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isloading: boolean;
    setAuth: (data: AuthData) => void;
    logout: () => void;
    checkAuth: () => void;
    updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set)=> ({
    user:null,
    token: null,
    isAuthenticated: false,
    isloading: true,
    
    
    setAuth:(data: AuthData) => {
        // 7 days expiration
        Cookies.set('token', data.token, {expires: 7, sameSite: 'Lax', path:'/'})
        Cookies.set('user', JSON.stringify(data.result), {expires: 7, sameSite: 'Lax', path:'/'})
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.result));
        set({user: data.result, token: data.token, isAuthenticated: true, isloading: false})
    },

    logout:() => {
        Cookies.remove('token', { path:'/'})
        Cookies.remove('user', { path:'/'})
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({user:null, token: null, isAuthenticated: false, isloading: false})
    },

    checkAuth:() => {
        const token = Cookies.get('token') || localStorage.getItem('token');
        const userStr = Cookies.get('user') || localStorage.getItem('user');

        if(token && userStr) {
            try {
                const user = JSON.parse(userStr)
                Cookies.set('token', token, {expires: 7, sameSite: 'Lax', path:'/'})
                Cookies.set('user', JSON.stringify(user), {expires: 7, sameSite: 'Lax', path:'/'})
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                set({user: user, token, isAuthenticated: true, isloading: false})
            } catch {
                Cookies.remove('token', { path:'/'})
                Cookies.remove('user', { path:'/'})
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                set({user:null, token: null, isAuthenticated: false, isloading: false}) 
            }
        } else {
                set({user:null, token: null, isAuthenticated: false, isloading: false}) 
        }
    },
    updateUser:(user: User) => {
        Cookies.set('user', JSON.stringify(user), {expires: 7, sameSite: 'Lax', path:'/'})
        localStorage.setItem('user', JSON.stringify(user));
        set({user})
    },
}))