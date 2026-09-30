'use client';

import {createContext, useContext, useEffect, useState, ReactNode} from 'react';
import {io, Socket} from 'socket.io-client';
import {useAuthStore} from '@/lib/store/useAuthStore';

interface SocketContextType {
    socket: Socket | null;
    onlineFriends: string[];
    refreshPresence: () => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    onlineFriends: [],
    refreshPresence: ()=> {}
})

export const useSocket = () => useContext(SocketContext)


export const SocketProvider = ({ children }: {children: ReactNode}) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [onlineFriends, setOnlineFriends] = useState<string[]>([]);
    const { user } = useAuthStore();

    const refreshPresence = () => {
        if(socket?.connected && user?._id) {
            socket.emit('setUserId', user._id);
        }
    }

    useEffect(()=>{
        let newSocket: Socket | null = null;

        if(user?._id && typeof window !== 'undefined'){
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

            newSocket = io(API_URL)

            queueMicrotask(()=>{
                setSocket(newSocket);
            })

            newSocket.on('connect', ()=> {
                newSocket!.emit('setUserId', user._id);
            });

            newSocket.on('onlineFriends', (friendIds: string[])=> {
                setOnlineFriends(friendIds)
            });

            newSocket.on('friendConnected', (data: { connectedUserId: string })=> {
               setOnlineFriends(prev => {
                if(!prev.includes(data.connectedUserId)){
                    return [...prev, data.connectedUserId]
                }
                return prev;
               })
            });

            newSocket.on('friendDisconnected', (data: { disconnectedUserId: string })=> {
               setOnlineFriends(prev => prev.filter(id => id !== data.disconnectedUserId))
            });

            return () => {
                newSocket?.disconnect();
                setSocket(null)
            }

        }
    }, [user?._id])

    return (
        <SocketContext.Provider value={{ socket, onlineFriends, refreshPresence }}>
            {children}
        </SocketContext.Provider>
    )
}