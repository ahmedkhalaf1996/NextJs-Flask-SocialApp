'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react'
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useSocket } from '@/components/providers/SocketProvider';
import { ChatMessage, UnreadMsg, User } from '@/types';
import {Send, Users, MessageSquare} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns';

const PAGE_SIZE = 8;

const dedupeMessages = (messages: ChatMessage[]) => {
    const messagesById = new Map<string, ChatMessage>();

    messages.forEach((message, index) => {
        messagesById.set(message._id || `${message.sender}-${message.recever}-${message.createdAt || index}-${message.content}`, message);

    })
    return Array.from(messagesById.values());
}

export default function ChatPage(){
    const {user} = useAuthStore();
    const {socket, onlineFriends} = useSocket();

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMsg, setInputMsg] = useState('');
    const [sending, setSending] = useState(false);
    const [contacts, setContacts] = useState<User[]>([]);
    const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});
    const [page, setPage] =  useState(0);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [LoadingContacts, setLoadingContacts] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const preserveScrollRef = useRef(false);
    const previousScrollHeightRef = useRef(0);
    const shouldScrollToBottomRef = useRef(true);

    const fetchUnreadMessages = useCallback(async ()=> {
        if(!user?._id) return;
        try {
            const { data } = await api.get('/chat/get-user-unreadedmsg', {
                params: {
                    userid: user._id,
                },
            });

            console.log('data', data)

            const unreadMap = (data.messages || []).reduce((acc: Record<string, number>, item: UnreadMsg) => {
                acc[item.otherUserid] = item.numOfUnReadedMessages || 0;
                return acc;
            }, {})
            setUnreadByUser(unreadMap)
        } catch  {
            setUnreadByUser({});
        }
    }, [user])

    useEffect(()=> {
        const fetchContacts = async ()=> {
            if(!user?._id) return;

            setLoadingContacts(true);

            try {
                const {data} = await api.get('/user/getUser', {
                    params: {
                        userid: user._id,
                        withPosts: false,
                    }
                });
                const userData = data.user;
                const allContactIds = [...new Set([...(userData.followers || []), ...(userData.following || [])])]
                    .filter((id) => id !== user._id);
                
                const contactPromises = allContactIds.map(async (id: string)=> {
                    try {
                        const res = await api.get('/user/getUser', {
                            params:{
                                userid: id,
                                withPosts: false,
                            }
                        });
                        return res.data.user;
                    } catch  {
                        return null
                    }
                });

                const results = await Promise.all(contactPromises);
                setContacts(results.filter(Boolean) as User[]);
                await fetchUnreadMessages();
            } catch  {
                console.error("Failed to fetch contacts");
            } finally {
                setLoadingContacts(false);
            }
        };

        fetchContacts();
    }, [fetchUnreadMessages, user?._id]);

    useEffect(()=>{
      if(!selectedUser?._id || !user?._id) return;
      let cancelled = false;

      const fetchInitialHistory = async () => {
        setLoadingHistory(true);
        shouldScrollToBottomRef.current = true;

        try {
            const {data} = await api.get('/chat/getmsgsbynums', {
                params: {
                    from: 0,
                    firstuid: user._id,
                    seconduid: selectedUser._id,
                }
            });

            if (cancelled) return;

            const nextmessages = dedupeMessages(data.msgs || []);
            setMessages(nextmessages);
            setPage(0);
            setHasMore(nextmessages.length === PAGE_SIZE);
            setUnreadByUser(prev => ({...prev, [selectedUser._id]: 0}))
            await api.post(`/chat/mark-msg-asreaded?mainuid=${user._id}&otheruid=${selectedUser._id}`)
            // await api.post('/chat/mark-msg-asreaded', {
            //     params: {
            //         mainuid: user._id,
            //         otheruid: selectedUser._id,
            //     }
            // })

        } catch (error) {
            console.log("er", error)
            if(!cancelled) console.error("Faild fetching chat");
        } finally {
            if (!cancelled) setLoadingHistory(false)
        }

 
      }

      fetchInitialHistory();

      return () => {
        cancelled =true;
      }
    }, [selectedUser?._id, user?._id])

    const loadMoreHistory = useCallback(async ()=> {
        if(!selectedUser?._id || !user?._id || loadingHistory || !hasMore) return;

        const container = messageContainerRef.current;
        previousScrollHeightRef.current = container?.scrollHeight || 0;
        preserveScrollRef.current = true;

        const nextPage = page + 1;
        setLoadingHistory(true);

        try {
            const {data} = await api.get('/chat/getmsgsbynums', {
                params: {
                    from: nextPage,
                    firstuid: user._id,
                    seconduid: selectedUser._id,
                }
            });

            const olderMessages = dedupeMessages(data.msgs || []);
            if(olderMessages.length > 0){
                setMessages(prev => dedupeMessages([...olderMessages, ...prev]));
                setPage(nextPage);
                setHasMore(olderMessages.length === PAGE_SIZE);
            } else {
                setHasMore(false)
            }
        } catch  {
            console.error("Faild fetching older chat history")
        } finally {
            setLoadingHistory(false)
        }


    }, [hasMore, loadingHistory, page, selectedUser, user])

    useEffect(()=> {
        if(!socket) return;
        const handleMessage = async (data: {fromUserId: string, message: ChatMessage}) => {
            const msg = data.message;
            if(!msg?.sender) return;

            if(selectedUser?._id === msg.sender || selectedUser?._id === msg.recever){
                shouldScrollToBottomRef.current = true;
                setMessages(prev=> dedupeMessages([...prev, msg]));
                setUnreadByUser(prev => ({...prev, [msg.sender]: 0}))

                if(user?._id){
                    await api.post(`/chat/mark-msg-asreaded?mainuid=${user._id}&otheruid=${msg.sender}`)
                    // await api.get('/chat/mark-msg-asreaded', {
                    //     params: {
                    //         mainuid: user._id,
                    //         otheruid: msg.sender,
                    //     }
                    // });
                }
            } else {
                setUnreadByUser(prev => ({
                    ...prev,
                    [msg.sender]: (prev[msg.sender] || 0) + 1,
                }));
            }
        };

        socket.on('privateMessage', handleMessage);
        return ()=> {
            socket.off('privateMessage', handleMessage)
        }
    }, [socket, selectedUser?._id, user?._id])

    useEffect(()=> {
        const container = messageContainerRef.current;
        if(!container) return;

        if(preserveScrollRef.current){
            const heightDiff = container.scrollHeight - previousScrollHeightRef.current;
            container.scrollTop = heightDiff;
            preserveScrollRef.current = false;
            return;
        }

        if(shouldScrollToBottomRef.current){
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth'});
            shouldScrollToBottomRef.current = false;
        }
    }, [messages])

    const handleMessagesScroll = () => {
        const container = messageContainerRef.current;
        if(!container || container.scrollTop > 80) return;
        loadMoreHistory();
    }


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!inputMsg.trim() || !selectedUser || !user?._id || sending) return;

        const msgContent = inputMsg;
        setInputMsg('');
        setSending(true);

        const payload = {
            content: msgContent,
            sender: user._id,
            recever: selectedUser._id,
        };
        try {
           const {data} = await api.post('/chat/sendmessage', payload);
           shouldScrollToBottomRef.current = true;
           setMessages(prev => dedupeMessages([...prev, data]));
           
           socket?.emit('privateMessage', {
            toUserId:selectedUser._id,
            message: data,
           });

        } catch  {
            console.error('Faild to sned message');
        } finally {
            setSending(false)
        }
    }

    const isUserOnline = (id: string) => onlineFriends.includes(id);
    const selectedUserImage = selectedUser?.imageUrl || '';


    return (
        <div className="flex h-full max-w-6xl mx-auto py-6 px-4 gap-4">
         <div className="w-80 bg-white rounded-2xl shadow-sm border border-gray-100 flex-col overflow-hidden shrink-0 hidden md:flex">
            <div className='p-5 border-b border-gray-100 bg-gray-50/80 flex items-center gap-2'>
             <Users className='text-indigo-600 w-5 h-5' />
             <h2 className='font-bold text-red-900'>Connections</h2>
             <span className='ml-auto text-xs text-gray-400'>{contacts.length}</span>
            </div>

            <div className='scrollbar-none flex-1 overflow-y-auto p-3 space-y-1'>
             {LoadingContacts ? (
                <div className='flex justify-center py-10'>
                    <div className='w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin'></div>
                </div>
                ) : contacts.length === 0 ? (
                    <div className='text-center py-10 text-gray-400 text-sm px-4'>
                        <p className='font-medium mb-1'>No connections yet</p>
                    </div>
                ) : (
                    contacts.map(contact => {
                        const unreadCount = unreadByUser[contact._id] || 0;
                        return (
                            <button key={contact._id} onClick={()=> setSelectedUser(contact)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${selectedUser?._id === contact._id ? 'bg-indigo-50 border-indigo-200' :'hover:bg-gray-50 border-transparent'} border text-left cursor-pointer`}>
                                <div className='relative shrink-0'>
                                 {contact.imageUrl ? (
                                    <img src={contact.imageUrl} className='w-11 h-11 rounded-full object-cover' alt=''/>
                                 ): (
                                    <div className='w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700'>
                                        {contact.name?.charAt(0).toUpperCase()}
                                    </div>
                                 )}
                                 {isUserOnline(contact._id) && (
                                    <div className='absolute -bottom-0.5 -right-0.5 w-3. h-3.5 bg-green-500 rounded-full border-2 border-white'></div>
                                 )}
                                </div>

                                <div className='flex-1 min-w-0'>
                                 <p className='font-semibold text-gray-900 truncate text-sm'>{contact.name}</p>
                                 <p className='text-xs text-gray-400 truncate'>{isUserOnline(contact._id) ? 'Online': 'offline'}</p>
                                </div>

                                {unreadCount > 0 && (
                                    <span className='flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white'>
                                        {unreadCount > 9 ? '9+': unreadCount}
                                    </span>
                                )}
                            </button>
                        )
                    })
                )
            }
            </div>
         </div>

        <div className='flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden relative'>
            {!selectedUser ? (
                <div className='flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50/50'>
                    <MessageSquare className='h-16 w-16 mb-4 text-gray-300' />
                    <h2 className='text-xl font-bold text-gray-700 mb-2'>Your Messages</h2>
                    <p className='text-sm'>Select a connection to start chatting</p>
                </div>
            ): (
                <>
                 <div className='p-4 border-b border-gray-100 bg-white flex items-center gap-3 shrink-0 shadow-sm z-10' >
                    <div className='relative'>
                     {selectedUser.imageUrl ? (
                        <img src={selectedUser.imageUrl} className='w-10 h-10 rounded-full object-cover' alt='' />
                     ) : (
                        <div className='w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700'>
                            {selectedUser.name?.charAt(0).toUpperCase()}
                        </div>
                     )}
                     {isUserOnline(selectedUser._id) && (
                        <div className='absolute border-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white'></div>
                     )}

                    </div>
                    <div>
                     <h2 className='font-bold text-gray-900 leading-tight'>{selectedUser.name}</h2>
                     <p className='text-xs text-gray-500'>{isUserOnline(selectedUser._id) ? 'Active now': 'offline'}</p>
                    </div>
                 </div>

                 <div ref={messageContainerRef} onScroll={handleMessagesScroll}
                 className='scrollbar-none flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50 flex flex-col gap-3'>
                    {loadingHistory && (
                        <div className='text-center pb-2'>
                            <span className='text-xs font-semibold text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full'>
                                Loading...
                            </span>
                        </div>
                    )}

                    {!hasMore && messages.length > 0 && (
                        <p className='text-center text-xs text-gray-400 pb-2'>Begining of conversation</p>
                    )}

                    {messages.length === 0 && !loadingHistory && (
                        <div className='text-center py-10 text-gray-400 text-sm mt-auto mb-auto'>
                            Say hi to {selectedUser.name}.
                        </div>
                    )}

                    {messages.map((msg, idx) => {
                        const isMe = msg.sender === user?._id;
                        return (
                            <div key={msg._id || idx} className={`flex max-w-[82%] gap-2 ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}>
                                {!isMe && (
                                    <div className='mt-auto h-8 w-8 shrink-0 overflow-hidden rounded-full bg-indigo-100  text-xs font-bold text-indigo-700 flex items-center justify-center'>
                                        {selectedUserImage ? (
                                            <img src={selectedUserImage} className='h-full w-full object-cover' alt='' />
                                        ): (
                                            selectedUser.name?.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                )}

                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`px-4 py-2.5 rounded-2xl ${isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-bl-sm'}`}>
                                        {msg.content}
                                    </div>
                                    <span className='text-[10px] text-gray-400 mt-1 px-1'>
                                        {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), {addSuffix: true}) : 'Just Now'}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={messagesEndRef} />
                 </div>
                  
                  <div className='p-4 border-t border-gray-100 bg-white shrink-0'>
                    <form onSubmit={handleSendMessage} className='flex gap-3'>
                     <input 
                      type='text'
                      placeholder='Type a message...'
                      value={inputMsg}
                      onChange={e => setInputMsg(e.target.value)}
                      className='flex-1 bg-gray-100 border border-gray-200 text-gray-900 rounded-full px-5 py-3 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition'
                     />
                     <button type='submit' disabled={!inputMsg.trim() || sending}
                     className='w-12 h-12 shrink-0 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer'>
                        <Send className='w-5 h-5 ml-0.5' />
                     </button>
                    </form>
                  </div>
                </>
            )}
        </div>

        </div>
    )

}



