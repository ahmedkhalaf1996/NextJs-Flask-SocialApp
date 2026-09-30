'use client';

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";

const PUBLIC_ROUTES = ['/auth'];

export default function AuthGuard({ children}: {children: React.ReactNode}) {
    const {isAuthenticated, isloading} = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(()=>{
        if (!isloading && !isAuthenticated && !PUBLIC_ROUTES.includes(pathname)){
            router.push('/auth')
        }
    }, [isAuthenticated, isloading, pathname, router]);

    if(isloading){
       return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600"></div>
        </div>
       )
    }

    if(!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)){
        return null
    }

    return <>{children}</>
}