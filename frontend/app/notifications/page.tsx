'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { Notification } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckSquare } from 'lucide-react';
import Link from 'next/link';
import { useSocket } from '@/components/providers/SocketProvider';

export default function NotificationPage(){
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const {user} = useAuthStore();
    const {socket} = useSocket();

    const fetchNotifications = useCallback(async ()=> {
        if(!user?._id) return;
        try {
            setLoading(true);
            const {data} = await api.get(`/notification/${user._id}`);
            setNotifications(data.notifications || []);
        } catch  {
            console.error("failed to load notifications")
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(()=>{
        queueMicrotask(()=> {
            fetchNotifications();
        })
    }, [fetchNotifications])

    useEffect(()=>{
        if (!socket) return;

        const handleNotification = async(newNotif: Notification) => {
            let nextNotif = newNotif;
            if(!nextNotif.user?.name && nextNotif.userid){
                try {
                   const {data} = await api.get('/user/getUser', {
                    params: {
                        userid: nextNotif.userid,
                        withPosts: false
                    }
                   });
                   nextNotif = {
                    ...nextNotif,
                    user: {
                        name: data.user?.name || '',
                        avatar: data.user?.imageUrl || '',
                    }
                   }
                } catch {
                  // keep the realtime even if rnrichment fials  
                }
            }

            setNotifications(prev => [nextNotif, ...prev.filter(notif => notif._id !== nextNotif._id)]);
        };

        socket.on('receiveNotification', handleNotification);
        return ()=> {
            socket.off('receiveNotification', handleNotification);
        }
    }, [socket])

    const markAllRead = async ()=> {
        if(!user?._id) return;
        try {
            await api.get(`/notification/mark-notification-asreaded?id=${user._id}`);
            setNotifications(prev => prev.map(n => ({...n, isreded: true})))
        } catch  {
            console.error("Faild to mark notifications read")
        }
    }

    const unreadCount = notifications.filter(n => !n.isreded).length;

    return (
        <div className='scrollbar-none max-w-2xl mx-auto py-8 px-4 h-full overflow-y-auto'>
         <div className='flex items-center justify-between mb-8'>
          <h1 className='text-2xl font-bold text-gray-900 flex items-center gap-2'>
           <Bell className='w-6 h-6 text-indigo-600' /> Notifications 
           {unreadCount > 0 && <span className='bg-red-500 text-white text-xs px-2.5 py-0.5 rounded-full' >{unreadCount}</span>}
          </h1>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className='flex items-center gap-2 text-sm text-indigo-600  hover:text-indigo-800 font-medium bg-indigo-50 px-4 py-2 rounded-lg transition'>
                <CheckSquare className='w-4 h-4'/>Mark All Read
            </button>
          )}
          </div>


      <div className="space-y-4 pb-32">
        {loading && <div className="text-center py-8"><div className="w-8 h-8 mx-auto border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}
        
        {!loading && notifications.length === 0 && (
           <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
             <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
             <p className="text-gray-500 font-medium">You have no notifications yet.</p>
           </div>
        )}


          {notifications.map((notif)=>(
            <div key={notif._id} className={`p-5 rounded-xl border transition flex gap-4 items-start  ${notif.isreded ? 'bg-white border-gray-100' : 'bg-indigo-50/50 border-indigo-100 shadow-sm relative'}`}>
             {!notif.isreded && <div className='absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-1-xl'></div>}
             <Link href={`/profile/${notif.userid}`} className='shrink-0'>
              {notif.user?.avatar ? (
                 <img src={notif.user.avatar} className='w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm' alt='' />

            ) : (
              <div className='w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shadow-sm'>
                {notif.user?.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
             </Link>

             <div className='flex-1'>
              <p className='text-sm text-gray-800 mb-1 leading-snug'>
                {notif.deatils.includes('commented') || notif.deatils.includes('liked') ? (
                 <Link href={`/posts/${notif.targetid}`} className='hover:text-indigo-600 transition' >
                  {notif.deatils}
                 </Link>   
                ): (
                <Link href={`/profile/${notif.targetid}`} className='hover:text-indigo-600 transition' >
                  {notif.deatils}
                 </Link> 
                )}
              </p>
              <p className='text-xs text-gray-400 font-medium'>
                {notif.createdAt ? formatDistanceToNow(new Date(notif.createdAt), {addSuffix: true}) : 'Just Now'}
              </p>
             </div>
            </div>
          ))}
         </div>
        </div>
    )
}











