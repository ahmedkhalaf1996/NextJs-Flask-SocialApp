'use client';

import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Mail, Lock, User, ArrowRight } from "lucide-react";

export default function AuthPage(){
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setloading] = useState(false)
    const [erorr, setError] = useState('');

    const {setAuth, isAuthenticated} = useAuthStore();
    const router = useRouter();

    // form states 
    const [formData, setFromData] = useState({
        firstName: '',
        lastName: '',
        email:'',
        password: '',
        confirmPassword:'',
    }) 

    useEffect(()=>{
        if (isAuthenticated){
            router.push('/')
        }
    }, [isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setloading(true);
        setError('');

        try {
            if(isLogin){
                const {data} = await api.post('/user/signin', {
                    email: formData.email,
                    password: formData.password
                });
                setAuth(data);
            } else {
                if(formData.password !== formData.confirmPassword){
                    setError("Passwords don't match")
                    setloading(false);
                    return;
                }
                const {data} = await api.post('/user/signup', formData);
                setAuth(data);
            }
        } catch (err: unknown) {
            const error = err as { response?: {data?:{error?: string; message?: string}} };
            setError(error.response?.data?.error || error.response?.data?.message || 'Authentication faild .Please try again.')
        } finally {
            setloading(false);
        }
    }

    if (isAuthenticated) return null;
    return (
       <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-8 lg:px-8 absolute inset-0 z-50">
          <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-xl">
            <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-2xl">
                    S
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    {isLogin ? 'Welcome back': 'Create an account'}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    {isLogin ? "Enter your details to access your account": "Join our community today"}
                </p>
            </div>
            {erorr && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium border border-red-200">
                    {erorr}
                </div>
            )}
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {!isLogin && (
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input 
                         name="firstName"
                         type="text"
                         required
                         className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                         placeholder="First Name"
                         value={formData.firstName}
                         onChange={(e)=> setFromData({...formData, firstName: e.target.value})}
                        />
                    </div>
                    <div className="relative flex-1">
                        <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input 
                         name="lastName"
                         type="text"
                         required
                         className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                         placeholder="Last Name"
                         value={formData.lastName}
                         onChange={(e)=> setFromData({...formData, lastName: e.target.value})}
                        />
                    </div>
                </div>
              )}

                <div className="relative ">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input 
                        name="email"
                        type="email"
                        required
                        className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={(e)=> setFromData({...formData, email: e.target.value})}
                    />
                </div>

                <div className="relative ">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input 
                            name="password"
                            type="password"
                            required
                            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Password"
                            value={formData.password}
                            onChange={(e)=> setFromData({...formData, password: e.target.value})}
                        />
                </div>

               {!isLogin && (
                <>
                    <div className="relative ">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input 
                            name="ConfirmPassword"
                            type="password"
                            required
                            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Confirm Password"
                            value={formData.confirmPassword}
                            onChange={(e)=> setFromData({...formData, confirmPassword: e.target.value})}
                        />
                    </div>
                </>
               )}
            </div>
            <div>
                <button type="submit" disabled={loading} className="group relative flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400">
                    {loading ? (
                        <div className="h-5 w- animate-spin rounded-full border-b-2 border-white"></div>
                    ): (
                        <>
                         {isLogin ? 'Sign in': 'Sign up'}
                         <ArrowRight className="ml-2 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}

                </button>
            </div>
            <div className="text-center text-sm">
                <span className="text-gray-600">
                    {isLogin ? "Don't have an account?": 'Already have an account?'}

                </span>
                <button type="button" onClick={()=>{
                    setIsLogin(!isLogin);
                    setError('');
                }}
                className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                         {isLogin ? 'Sign Up': 'Sign in'}

                </button>
            </div>
          </form>


          </div>
       </div>
    )
}

