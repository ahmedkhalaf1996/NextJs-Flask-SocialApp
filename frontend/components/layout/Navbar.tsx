'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useSocket } from "../providers/SocketProvider";
import { Home, Search, Bell, MessageCircle, User as UserICon, LogOut, Menu } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

import { Notification } from "@/types";
import { playMessageSound, playNotificatonSound, prepareNoificationSound } from "@/lib/sounds";

export default function Navbar(){
    const {user, isAuthenticated, logout} = useAuthStore();
    const {socket} = useSocket()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [unreadnotifications, setUnreadnotifications] = useState(0)
    const [unreadMessages, setUnreadMessages] = useState(0)
    const notificationCountRef = useRef(0);
    const messageCountRef = useRef(0);
    const countsReadyRef = useRef(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(()=> {
        const unlockSounds = ()=> {
            prepareNoificationSound();
            window.removeEventListener('pointerdown', unlockSounds);
            window.removeEventListener('keydown', unlockSounds);
        };

        window.addEventListener('pointerdown', unlockSounds, {once: true})
        window.addEventListener('keydown', unlockSounds, {once: true})

        return ()=> {
        window.removeEventListener('pointerdown', unlockSounds)
        window.removeEventListener('keydown', unlockSounds)
        }

    }, [])

    const fetchCounts = useCallback(async ()=> {
        if(!user?._id) return;

        try {
            const {data: notifData} = await api.get(`/notification/${user._id}`);
            const unread = (notifData.notifications || []).filter((n: Notification) => !n.isreded).length;
            notificationCountRef.current = unread;
            setUnreadnotifications(unread)
        } catch {
            // keep last knowin count
        }

        try {
            const {data: msgData} = await api.get(`/chat/get-user-unreadedmsg?userid=${user._id}`);
            const unread = msgData.total || 0;
            messageCountRef.current = unread;
            setUnreadMessages(unread)
        } catch {
            // keep last knowin count
        }

        countsReadyRef.current = true
    }, [user])

    useEffect(()=> {
        queueMicrotask(()=> {
            fetchCounts();
        });
    }, [fetchCounts, pathname])

    useEffect(()=>{
        if(!user?._id) return;

        const handleVisibilityChange = () => {
            if(document.visibilityState === 'visible'){
                fetchCounts();
            }
        }

         document.addEventListener('visibilitychange', handleVisibilityChange);
        return ()=>{
         document.removeEventListener('visibilitychange', handleVisibilityChange);
            
        }
    }, [fetchCounts, user?._id])

    // listen for raeltime notification/message events
    useEffect(()=>{
        if(!socket) return;

        const handleNewNotification = (notification: Notification) => {
            if(!notification?.isreded){
                playNotificatonSound();
                notificationCountRef.current += 1;
                setUnreadnotifications(prev => prev +1)
            }
            fetchCounts();
        }

        const handleNewMessage = () => {
            playMessageSound();
            if(!pathname.startsWith('/chat')){
                messageCountRef.current +=1;
                setUnreadMessages(prev => prev +1)
            }
        }

        socket.on('receiveNotification', handleNewNotification);
        socket.on('privateMessage', handleNewMessage);

        return ()=> {
            socket.off('receiveNotification', handleNewNotification);
            socket.off('privateMessage', handleNewMessage);
        }
    }, [fetchCounts, socket, pathname])

    // reset counts when visiting the pages
    useEffect(()=> {
        queueMicrotask(()=>{
            if(pathname === '/notifications') {
                notificationCountRef.current = 0;
                setUnreadnotifications(0)
            }
            if(pathname === '/chat'){
                messageCountRef.current = 0;
                setUnreadMessages(0);
            }
        })
    }, [pathname])

    if (!isAuthenticated) return null;

    const NavLinks = [
        {name: 'Home', href: '/', icon:Home, badge:0},
        {name: 'Search', href: '/search', icon:Search, badge:0},
        {name: 'Notifications', href: '/notifications', icon:Bell, badge:unreadnotifications},
        {name: 'Chat', href: '/chat', icon:MessageCircle, badge:unreadMessages},
        {name: 'Profile', href: `/profile/${user?._id}`, icon:UserICon, badge:0},
        ]

    return (
        <nav className="fixed top-0 z-50 w-full border-b border-gray-200 bg-white/90 backdrop-blur-md">
           <div className="mx-auto max-w-7x1 px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
                <div className="flex">
                    <Link href="/" className="flex shrink-0 items-center gap-2">
                     <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xl">S</div>
                     <span className="hiden sm:block text-x1 font-bold tracking-tight text-slate-900">SocialApp</span>
                    </Link>
                </div>

                <div className="hidden sm:ml- sm:flex sm:items-center sm:space-x-6">
                    {NavLinks.map((item)=>{
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (item.name === 'Profile' && pathname.startsWith('/profile/'));
                        return (
                            <Link key={item.name} href={item.href} className={
                                cn(
                                    'relative inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors',
                                    isActive 
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                                )
                            }
                            >
                                <span className="relative inline-flex">
                                 <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 2} />
                                 {item.badge > 0 && (
                                    <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white shadow-sm ring-2 ring-white">
                                        {item.badge > 9 ? '9+': item.badge}
                                    </span>
                                 )}
                                </span>
                                {item.name}
                         </Link>
                        )
                    })}
                    <div className="ml-4 flex items-center border pl-4 border-gray-200 gap-4">
                        {user?.imageUrl ?(
                            <img className="h-8 w-8 rounded-full object-cover ring-2 ring-indigo-500/20" src={user.imageUrl} alt="" />
                        ) :(
                            <div className="h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                        )}

                        <button onClick={()=>{
                            logout();
                            router.push('/auth');
                        }}
                        className="text-gray-400 hover:text-gray-600 transition cursor-pointer">
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center sm:hidden">
                    <button onClick={()=> setMobileMenuOpen(!mobileMenuOpen)} 
                            className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                            >
                             <Menu className="h-6 w-6" />       
                        </button>
                </div>
            </div>
           </div>
           {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="sm:hidden border-t border-gray-200 bg-white">
                 <div className="space-y-1 pb-3 pt-2">
                    {NavLinks.map((item) =>{
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (item.name === 'Profile' && pathname.startsWith('/profile/'));
                        return (
                            <Link 
                                key={item.name} 
                                href={item.href} 
                                onClick={()=> setMobileMenuOpen(false)}
                                className={
                                cn(
                                    'block border-1-4 py-2 pl-3 pr-4 text-base font-medium',
                                    isActive 
                                    ?   'border-indigo-500 bg-indigo-50 text-indigo-700'
                                    : 'border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800'
                                )}
                            >
                            <div className="flex items-center justify-between">
                                <div  className="flex items-center">
                                 <Icon className="mr-3 h-5 w-5"  />
                                 {item.name}
                                </div>
                                {item.badge > 0 && (
                                    <span className="flex  h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold  text-white shadow-sm ring-2 ring-white">
                                        {item.badge > 9 ? '9+': item.badge}
                                    </span>
                                 )}
                            </div>
                         </Link>
                        )
                        })}
                        <button onClick={()=>{
                            setMobileMenuOpen(false);
                            logout();
                            router.push('/auth')
                        }}
                         className="block w-full text-left border-1-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
                        >
                            <div className="flex items-center">
                                <LogOut className="mr-3 h-5 w-5" />
                                Sign Out
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </nav>
    )
}