'use client';

import React, { useCallback, use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Post, Comment } from "@/types";
import PostCard from "@/components/ui/PostCard";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { hydratePostCreatorImages } from "@/lib/posts";
import { Send, Trash2 } from "lucide-react";


export default function PostDetailsPage({params}: {params: Promise<{id: string}>}) {
    const resolveParams = use(params);
    const [post, setPost]= useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setloading] = useState(true);
    const [commentVal, setCommentVal] = useState('');
    const [Submitting, setSubmitting] = useState(false);

    const {user} = useAuthStore();
    const router = useRouter();

    const fetchPostData = useCallback(async ()=> {
        try {
           setloading(true);
           const {data} = await api.get(`/posts/${resolveParams.id}`) 
           if (data.post) {
            const [hydratedPost] = await hydratePostCreatorImages([data.post], user);
            setPost(hydratedPost);
            setComments(hydratedPost.comments || []);
           }
        } catch  {
            console.error("Faild to load post")
        } finally {
            setloading(false)
        }
    }, [resolveParams.id, user])

    useEffect(()=>{
        if (resolveParams.id) {
            queueMicrotask(()=> {
                fetchPostData();
            })
        }
    }, [fetchPostData, resolveParams.id])

    const handleAddComment = async (e:React.FormEvent) => {
        e.preventDefault();
        if(!commentVal.trim() || !user || Submitting) return

        setSubmitting(true);
        try {
            await api.post(`/comment/${resolveParams.id}`, {value: commentVal});
            setCommentVal('');
            await fetchPostData();
        } catch  {
            console.error("Faild to add comment")
        } finally {
            setSubmitting(false)
        }

    }

    const handleDeleteComment = async (commentId: string) => {
        if(!confirm('Delete Comment?')) return;
        try {
            await api.delete(`/comment/${commentId}`);
            setComments(prev => prev.filter(c => c._id !== commentId))
        } catch {
            console.error("Faild to delete comment")
        }
    }

    if(loading){
        return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div></div>
    }

    if(!post && !loading){
        return <div className="p-8 text-center text-gray-500">Post Not found!</div>
    }

    return (
        <div className="scrollbar-none max-w-3xl mx-auto py-8 px-4 h-full overflow-y-auto pb-32">
            {post && (
                <PostCard
                    post={post}
                    onDelete={()=> router.push('/')}
                    onUpdate={(update)=> setPost(update)}
                />
            )}

            {/* Comments  */}
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6 ">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Comments ({comments.length})</h3>

              <form onSubmit={handleAddComment} className="flex gap-3 mb-8">
                 <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-100 flex items-center  justify-center text-indigo-700 font-black  overflow-hidden">
                    {user?.imageUrl ? (
                     <img src={user.imageUrl} className="h-full w-full object-cover" alt="" />    
                    ): (
                        user?.name?.charAt(0).toUpperCase()
                    )}
                 </div>
                 <div className="flex-1 relative">
                    <input type="text"
                     placeholder="Write a comment..."
                     value={commentVal}
                     onChange={(e)=> setCommentVal(e.target.value)}
                     className="w-full bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 pr-12  text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                    />
                    <button
                      type="submit"
                      disabled={Submitting || !commentVal.trim()}
                      className="absolute right-2 top-1.5 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                    <Send className="w-4 h-4" />                        
                    </button>
                 </div>
              </form>
             
             <div className="space-y-5">
                {comments.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-">No Comments yet . Be the first!</p>
                )}
                {comments.map((comment)=> (
                    <div key={comment._id} className="flex gap-3 group">
                        <Link href={`/profile/${comment.creator}`}>
                        {comment.creator_avatar ? (
                          <img src={comment.creator_avatar}  className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200" alt="" />    
                        ): (
                            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                {(comment.creator_name || '?').charAt(0).toUpperCase()}
                            </div>
                        )}
                        </Link>

                        <div className="flex-1 flex gap-2">
                            <div className="bg-gray-50 px-4 py-2.5 rounded-2xl rounded-tl-none border border-gray-100">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <Link href={`/profile/${comment.creator}`} className="font-semibold text-sm text-gray-900 hover:text-indigo-600">
                                    {comment.creator_name || 'Unkonw'}
                                  </Link>
                                  <span className="text-[10px] text-gray-400">
                                    {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), {addSuffix: true}) : ''}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700">{comment.value}</p>
                            </div>
                            {user?._id === comment.creator && (
                                <div className="flex items-start pt-1">
                                    <button onClick={()=> handleDeleteComment(comment._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition opacity-0 group-hover:opacity-100">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
             </div>

            </div>
        </div>
    )

}

