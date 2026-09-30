'use client'

import React, { useState, useEffect, useCallback, useRef } from "react";
import {api} from '@/lib/api';
import { Post } from "@/types";
import PostCard from "@/components/ui/PostCard";
import RightSidebar from "@/components/layout/RightSidebar";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { ImagePlus, Send } from "lucide-react";
import { convertBase64 } from "@/lib/utils";
import { hydratePostCreatorImages } from "@/lib/posts";


export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const {isAuthenticated, user} = useAuthStore()

  // New Post Form
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeFeeduserId = useRef<string | null>(null);

  const fetchPosts = useCallback(async (pageNum: number, currentUser: NonNullable<typeof user>) =>{
    try {
      setLoading(true)
      const {data} = await api.get('/posts', {
        params:{
          page: pageNum,
          id: currentUser._id,
        }
      });
      if(data.data){
        const hydratedPosts = await hydratePostCreatorImages(data.data, currentUser);
        setPosts(prev=> pageNum ==1 ? hydratedPosts: [...prev, ...hydratedPosts])
        setNumberOfPages(data.numberOfPages || 1);
      }

    } catch (e) {
      console.error("Faild to load psots", e)
    } finally {
      setLoading(false);
    }
  }, [])

  useEffect(()=>{
    if(!isAuthenticated || !user?._id){
      activeFeeduserId.current = null;
      queueMicrotask(()=>{
        setPosts([]);
        setPage(1);
        setNumberOfPages(1);
        setLoading(false)
      });
      return;
    }

    if(activeFeeduserId.current !== user._id){
      activeFeeduserId.current = user._id;

      if(page !== 1){
        queueMicrotask(()=> {
         setPosts([]);
         setNumberOfPages(1);
         setPage(1)         
        });
        return
      }
      queueMicrotask(()=> {
         setPosts([]);
         setNumberOfPages(1);
        });
    }

    fetchPosts(page, user);
  }, [page, isAuthenticated, user, user?._id, fetchPosts]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!title.trim() || !message.trim() || submitting) return;

    setSubmitting(true);

    try {
      const {data} = await api.post('/posts', {
        title,
        message,
        selectedFile: selectedFile || '',
        name: user?.name || '',
      });

      if(data?.result){
        setPosts(prev => [{...data.result, creator_avatar: user?.imageUrl || ''}, ...prev]);
        setTitle('');
        setMessage('');
        setSelectedFile('');
      }
    } catch (e) {
      console.error("Post cration failed", e)
    } finally {
      setSubmitting(false);
    }

  } 


    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>)=> {
      const file = e.target.files?.[0];
      if(file){
        const base64 = await convertBase64(file);
        setSelectedFile(base64)
      }
    };

    const handlePostUpdate = (updatedPost: Post) => {
      setPosts(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p));
    }

    if(!isAuthenticated) return null;

    const hasMore = page < numberOfPages;

  return (
    <div className="flex items-start justify-center gap-8 px-4 sm:px-6 lg:px-8 py-8 h-full overflow-y-auto pb-32">
      <div className="w-full max-w-2xl space-y-6">
       {/* create post  */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
         <form onSubmit={handlePostSubmit}>
          <div className="flex gap-4">
           <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
            {user?.imageUrl ? (
              <img src={user.imageUrl} className="h-full w-full rounded-full object-cover" alt="" />
            ): (
              user?.name?.charAt(0).toUpperCase()
            )}
           </div>
           <div className="flex-1 space-y-3">
            <input
              type="text"
              placeholder="What's this about?"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              value={title}
              onChange={(e)=> setTitle(e.target.value)}
              required 
            />
            <textarea
              placeholder="What's on your mind?"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
              value={message}
              onChange={(e)=> setMessage(e.target.value)}
              required 
              rows={3}
            />

            {selectedFile && (
              <div className="relative rounded-lg overflow-hidden h-32 w-full">
                <img src={selectedFile} className="object-cover w-full h-full" alt="Preview"/>
                <button type="button" onClick={()=> setSelectedFile('')} className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-black/70">
                  &times;
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
             <label className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition cursor-pointer px-2 py-1 rounded-md hover:bg-indigo-50">
              <ImagePlus className="w-5 h-5" />
              <span className="text-sm font-medium">Photo</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
             </label>

             <button 
              type="submit"
              disabled={submitting || !title || !message}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
             >
              {submitting ? 'Posting...': 'Post'}
              <Send className="w-4 h-4 ml-1" />
             </button>
            </div>
           </div>
          </div>
         </form>
        </div>

            {/* Feed  */}
            <div className="space-y-6">
             {posts.map((post)=> (
              <PostCard 
               key={post._id}
               post={post}
               onDelete={(id)=> setPosts(prev => prev.filter(p => p._id !== id))}
               onUpdate={handlePostUpdate}
              />
             ))}

             {loading && (
              <div className="flex justify-center py-6">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
              </div>
             )}

             {!loading && hasMore && (
              <button onClick={()=> setPage(p=> p +1)} 
              className="w-full py-4 text-center text-indigo-600 font-medium hover:bg-indigo-50 rounded-xl transition"
              >
                Load more
              </button>
             )}

             {!loading && !hasMore && posts.length > 0 && (
              <div className="py-8 text-center text-gray-400 text-sm">
                You&apos;ve reached The end!
              </div>
             )}

             {!loading && posts.length === 0 && (
              <div className="py-16 text-center bg-white rounded-xl border border-gray-100">
                <p className="text-gray-400 font-medium">No posts yet. Be the first to share something!</p>
              </div>
             )}
            </div>
      </div>
      <RightSidebar />
    </div>
  );
}
