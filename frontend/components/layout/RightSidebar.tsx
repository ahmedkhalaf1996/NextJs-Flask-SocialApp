'use client';

import { useAuthStore } from "@/lib/store/useAuthStore";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { User } from "@/types";
import Link from 'next/link';

export default function RightSidebar(){
    const {user} = useAuthStore();
    const [suggestions, setSuggestions] = useState<User[]>([]);
    const [loadingSuggestions, setLoaidngSuggestions] = useState(false);

    useEffect(()=>{
        if(!user?._id) return;
        const fetchSuggestions = async ()=>{
            setLoaidngSuggestions(true);
            try {
                const {data} = await api.get(`/user/getSug?id=${user._id}`);
                const usersById = new Map<string, User>();
                (data.users || []).forEach((suggesedUser: User)=>{
                    if(suggesedUser._id !== user._id){
                        if(suggesedUser._id !== user._id){
                            usersById.set(suggesedUser._id, suggesedUser)
                        }
                    }
                })
                setSuggestions(Array.from(usersById.values()));
            } catch  {
               console.log("Faild to fetch suggestions") 
            } finally {
                setLoaidngSuggestions(false);
            }
        }
        fetchSuggestions();
    }, [user?._id])


    if(!user) return null;

    return (
        <div className="hidden lg:block w-80 shrink-0 self-start">
            <div className="sticky top-0 space-y-6">
            {/* User Card  */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <Link href={`/profile/${user._id}`} className="flex items-center space-x-4 md-4 group">
                 {user.imageUrl ? (
                    <img src={user.imageUrl} className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/20" alt="" />

                 ): (
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex justify-center items-center font-bold text-xl text-indigo-700">
                        {user.name?.charAt(0).toUpperCase()}
                    </div>
                 )}
                <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition">{user.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{user.bio || 'no bio yet'}</p>
                </div>
              </Link>
              <div className="flex justify-between border-t border-gray-100 pt-4 px-2">
                 <div className="text-center">
                  <span className="block font-semibold text-gray-900">{user.following?.length || 0}</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Following</span>
                 </div>
                <div className="text-center">
                  <span className="block font-semibold text-gray-900">{user.followers?.length || 0}</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Followers</span>
                 </div>
              </div>
            </div>


            {/* sugestions  */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">People You May Know</h3>
                <div className="space-y-4">
                    {loadingSuggestions ? (
                        <div className="flex justify-center py-4">
                            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ): suggestions.length === 0 ? (
                        <p className="text-sm text-gray-400">No suggestions right now</p>
                    ): (
                        suggestions.slice(0, 5).map((sug)=> (
                            <Link key={sug._id} href={`/profile/${sug._id}`} className="flex items-center space-x-3 group">
                             {sug.imageUrl ? (
                                <img src={sug.imageUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
                             ): (
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                    {sug.name?.charAt(0).toUpperCase()}
                                </div>
                             )}
                             <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-600 transition truncate">{sug.name}</p>
                              <p className="text-xs text-gray-400 truncate">{sug.bio || 'New member'}</p>
                             </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
            </div>
        </div>
    )
}




