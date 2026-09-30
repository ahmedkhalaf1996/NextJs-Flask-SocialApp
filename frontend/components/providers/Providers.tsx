'use client';

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { SocketProvider } from "./SocketProvider";
import AuthGuard from "./AuthGuard";

export const Providers = ({ children }: {children: React.ReactNode}) => {
    const checkAuth = useAuthStore((state)=> state.checkAuth);
    const isLoading = useAuthStore((state)=> state.isloading);
    const [mounted, setMounted] = useState(false);

    useEffect(()=>{
        queueMicrotask(()=>{
            checkAuth();
            setMounted(true)
        })
    }, [checkAuth])

    if(!mounted || isLoading){
        return(
        <div className="flex h-screen w-full items-center justify-center bg-slate-50">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600"></div>
        </div>
        );
    }

    return (
        <SocketProvider>
            <AuthGuard>{children}</AuthGuard>
        </SocketProvider>
    )
}