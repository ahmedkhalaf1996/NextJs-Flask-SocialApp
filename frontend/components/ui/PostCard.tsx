'use client';

import { Comment, Post } from "@/types";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, Trash2, Pencil, Check, X, Send, ImagePlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn, convertBase64 } from "@/lib/utils";
import Link from "next/link";
import { getCommentCreatorImage, getPostCeatorImage } from "@/lib/posts";


interface PostCardProps {
    post: Post;
    onDelete?: (id: string) => void;
    onUpdate?: (updatedPost: Post) => void;
}

export default function PostCard({ post, onDelete, onUpdate }: PostCardProps) {
 const {user} = useAuthStore();
 const [likes, setLikes] = useState(post.likes || []);
 const [isLiking, setIsLiking] = useState(false);
 const [isEditing, setIsEditing] = useState(false);
 const [editTitle, setEditTitle] = useState(post.title);
 const [editMessage, setEditMessage] = useState(post.message);
 const [editSelectedFile, setEditSelectedFile] = useState(post.selectedFile || '');
 const [saving, setSaving] = useState(false);

 const [showComments, setShowComments] = useState(false);
 const [comments, setComments] = useState<Comment[]>(post.comments || [])
 const [commentVal, setCommentVal] = useState('');

 const [commentSubmitting, setCommentSubmitting] = useState(false);
 const isLiked = user?._id ? likes.includes(user._id) : false;
 const isOwner = user?._id === post.creator;
 const creatorImage = getPostCeatorImage(post, user);

 useEffect(()=>{
    queueMicrotask(()=>{
        setLikes(post.likes || []);
        setComments(post.comments || []);
        setEditTitle(post.title);
        setEditMessage(post.message);
        setEditSelectedFile(post.selectedFile || '');
    })
 }, [post])

//   handlelike 
const handleLike = async () => {
    if(!user?._id || isLiking) return;
    setIsLiking(true);

    setLikes(prev => isLiked ? prev.filter(i => i !== user._id ) : [...prev, user._id]);

    try {
        await api.patch(`/posts/${post._id}/likePost`);
    } catch (e) {
    setLikes(prev => isLiked ?  [...prev, user._id] : prev.filter(i => i !== user._id ) );
        
    } finally {
        setIsLiking(false)
    }
}


// handle delete 
const handleDelete = async () => {
    if(!isOwner || !onDelete) return;
    if(confirm('Are you sure you want to delte this post?')){
        try {
            await api.delete(`/posts/${post._id}`);
            onDelete(post._id);
        } catch  {
            console.error("Faild to delete")
        }
    }
}

// handle add comment 
const handleAddComment = async (e:React.FormEvent) => {
    e.preventDefault();
    if (!commentVal.trim() || !user?._id || commentSubmitting) return;

    setCommentSubmitting(true);
    try {
        const { data } = await api.post(`/comment/${post._id}`, {value: commentVal})
        const updatedPost = data?.data;
        if(updatedPost){
            const nextpost = {
                ...post,
                ...updatedPost,
                creator_avatar: getPostCeatorImage(updatedPost, user) || creatorImage,
            };
            setComments(nextpost.comments || []);
            onUpdate?.(nextpost);
        }
        setCommentVal('');
        setShowComments(true)
    } catch  { 
        console.error("Faild to add comment")        
    } finally {
        setCommentSubmitting(false)
    }
}


// handle delte the comment 
const handleDeleteComment = async (commentId: string) => {
    try {
        await api.delete(`/comment/${commentId}`);
        const nextComments = comments.filter(comment => comment._id !== commentId);
        setComments(nextComments);
        onUpdate?.({...post, comments:nextComments})
    } catch  {
        console.error("Faild to delete comment")        
        
    }
}

// handle save edit 
const handleSaveEdit = async ()=> {
    if(!editTitle.trim() || !editMessage.trim() || saving) return;
    setSaving(true);

    try {
        await api.patch(`/posts/${post._id}`, {
            title: editTitle,
            message: editMessage,
            selectedFile: editSelectedFile,
            name: post.name,
        })
        setIsEditing(false);
        if(onUpdate){
            onUpdate({...post,  title: editTitle, message: editMessage, selectedFile: editSelectedFile })
        }

    } catch  {
        console.error("Faild to update")        
        
    } finally {
        setSaving(false)
    }
}


/// handle edit image upload 
const handleEditImageUpload = async(e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if(!file) return;
    try {
        const base64 = await convertBase64(file);
        setEditSelectedFile(base64);
    } catch  {
        console.error("Faild to update post image")        
    }
}


return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition duration-200">
        <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
                <Link href={`/profile/${post.creator}`} className="flex items-center space-x-3 group">
                <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden">
                    {creatorImage ? (
                        <img src={creatorImage} className="h-full w-full object-cover" alt="" />
                    ): (
                        post.name?.charAt(0).toUpperCase()
                    )}
                </div>
                <div>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition">{post.name}</p>
                    <p className="text-xs text-gray-500">
                        {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), {addSuffix: true}) : 'Just Now'}
                    </p>
                </div>
                </Link>
                {isOwner && (
                    <div  className="flex items-center gap-1">
                        {!isEditing && (
                            <button onClick={()=> setIsEditing(true)} className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition">
                                <Pencil className="h-4 w-4" />
                            </button>
                        )}
                        {onDelete && (
                            <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                        
                    </div>
                )}
            </div>

            {/* editing part  */}
            <div className="m-4">
                {isEditing ? (
                    <div className="space-y-3">
                        <input 
                            type="text"
                            value={editTitle}
                            onChange={(e)=> setEditTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500  focus:border-transparent"

                        />
                        <textarea 
                            rows={3}
                            value={editMessage}
                            onChange={(e)=> setEditMessage(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500  focus:border-transparent resize-none"
                        />

                        <div className="flex gap-2 justify-end">
                            <button type="button" 
                             onClick={()=>{
                                setIsEditing(false);
                                setEditTitle(post.title);
                                setEditMessage(post.message);
                                setEditSelectedFile(post.selectedFile || '');
                             }}
                             className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            >
                                <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                            <button type="button" 
                             onClick={handleSaveEdit}
                             disabled={saving}
                             className="flex items-center gap-1 px-3 py-1.5 text-sm  text-white  bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                            >
                                <Check className="w-3.5 h-3.5" /> {saving ? 'Saving...': 'Save'}
                            </button>
                        </div>
                        <div className="space-y-3">
                             {editSelectedFile && (
                                <div className="relative aspect-video overflow-hidden rounded-lg bg-gray-100">
                                    <img src={editSelectedFile} alt="" className="h-full w-full object-cover" />
                                    <button type="button"
                                    onClick={()=> setEditSelectedFile('')}
                                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center  rounded-full bg-black/60 text-white transition hover:bg-black/75"
                                    >
                                        <X className="h-4 w-4"/>
                                    </button>
                                </div>
                             )}
                             <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50  hover:text-indigo-600">
                                <ImagePlus className="h-4 w-4" />
                                {editSelectedFile ? 'Change image': 'Add image'}
                                <input type="file" className="hidden" accept="image/*" onChange={handleEditImageUpload} />
                             </label>
                        </div>
                    </div>
                ): (
                    <Link href={`/posts/${post._id}`}>
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition">{editTitle}</h3>
                        <p className="mt-2 text-sm text-gray-600 line-clamp-3">{editMessage}</p>
                    </Link>
                )}
            </div>
        </div>
                
        {post.selectedFile && !isEditing && (
            <div className="relative w-full bg-gray-100 aspect-video overflow-hidden">
                <img src={post.selectedFile} alt={post.title} className="object-cover w-full h-full hover:scale-105 transition duration-500"/>
            </div>
        )}

        <div className="px-4 py-3 sm:px-5 border-t border-gray-50 flex items-center text-gray-500">
         <div className="flex items-center space-x-6">
          <button onClick={handleLike}
          disabled={isLiking}
          className={cn(
            "flex items-center space-x-2 text-sm transition-colors cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed",
            isLiked ? "text-pink-600" : "hover:text-pink-600"
          )}
          >
            <Heart className={cn("h-5 w-5 group-hover:scale-110 transition-transform", isLiked  && "fill-current")} />
            <span className="font-medium">{likes.length > 0 && likes.length}</span>
          </button>
          <button type="button"
          onClick={()=> setShowComments(value => !value)}
          className="flex items-center space-x-2 text-sm hover:text-indigo-600 transition-colors group cursor-pointer"
          >
            <MessageCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium">{comments.length > 0 && comments.length}</span>
          </button>
         </div>
        </div>

          {showComments && (
            <div className="border-t border-gray-50 bg-gray-50/60 px-4 py-4 sm:px-5">
                <form onSubmit={handleAddComment} className="mb-4 flex gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden">
                        {user?.imageUrl ? (
                            <img src={user.imageUrl} className="h-full w-full object-cover" alt="" />
                        ): (
                            user?.name?.charAt(0).toUpperCase()
                        )}

                    </div>
                    <div className="relative flex-1">
                        <input
                        type="text"
                        value={commentVal}
                        onChange={(e)=> setCommentVal(e.target.value)}
                        placeholder="Write a comment..."
                        className="w-full rounded-full border border-gray-200 bg-white px-4 py-4 pr-11 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"

                         />
                         <button type="submit"
                         disabled={commentSubmitting || !commentVal.trim()}
                         className="absolute right-1.5 top-1.5 flex h-7 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-50"
                         >
                            <Send className="h-3.5 w-3.5" />
                         </button>
                    </div>
                </form>
                <div className="space-y-3">
                    {comments.length === 0 ? (
                        <p className="py-3 text-center text-sm text-gray-400">No Comments yet.</p>
                    ): (
                        comments.map((comment)=> {
                            const commentImage = getCommentCreatorImage(comment);
                            return (
                                <div key={comment._id} className="group flex gap-3">
                                    <Link href={`/profile/${comment.creator}`} className="shrink-0">
                                      {commentImage ? (
                                        <img src={commentImage} className="h-8 w-8 rounded-full object-cover ring-1 ring-gray-200" alt="" />

                                      ): (
                                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                            {(comment.creator_name || '?').charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    </Link>
                                    <div className="min-w-0 flex-1">
                                      <div className="inline-block max-w-full  rounded-2xl rounded-tl-sm  border border-gray-100 bg-white px-3 py-2">
                                        <Link href={`/profile/${comment.creator}`} className="text-xs font-semibold text-gray-900 hover:text-indigo-600">
                                         {comment.creator_name || 'Unknown'}
                                        </Link>
                                        <p className="break-words text-sm text-gray-700">{comment.value}</p>
                                      </div>
                                     <div className="mt-1 flex items-center gap-3 px-1 text-[10px] text-gray-400">
                                      <span>{comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt) , {addSuffix: true}) : 'Just now'}</span>
                                      {user?._id === comment.creator && (
                                        <button type="button" onClick={()=> handleDeleteComment(comment._id)} className="font-medium text-gray-400 opacity-0 transition hover:text-red-500 group-hover:opacity-100">
                                            Delete
                                        </button>
                                      )}
                                     </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div> 
          )}

    </div>
)


}










