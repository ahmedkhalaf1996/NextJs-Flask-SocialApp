'use client';

import { useCallback, useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import { User, Post } from '@/types';
import PostCard from '@/components/ui/PostCard';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { UserPlus, UserCheck, Edit3, X, Camera } from 'lucide-react';
import Link from 'next/link';
import { convertBase64 } from '@/lib/utils';
import { hydratePostCreatorImages } from '@/lib/posts';
import { useSocket } from '@/components/providers/SocketProvider';

export default function ProfilePage({params}: {params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState(1);
  const { user: currentUser, updateUser } = useAuthStore();
  const { refreshPresence } = useSocket();
  const [isFollowing, setIsFollowing] = useState(false);

  // Edit Profile Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const fetchUser = useCallback(async (pageNum: number) =>{
  try {
    setLoading(true);
    const {data} = await api.get(`/user/getUser?userid=${resolvedParams.id}&withPosts=true&page=${pageNum}`)
    const hydratedPosts = await hydratePostCreatorImages(data.posts || [], currentUser);
    if(pageNum === 1){
        setProfileUser(data.user);
        setPosts(hydratedPosts);
        setIsFollowing(data.user.followers?.includes(currentUser?._id || false));
        setNumberOfPages(data.numberOfPages || 1);
    } else {
        setPosts(prev => [...prev, ...hydratedPosts]);
    }

  } catch  {
    console.error("Faild to load profile")
  } finally {
    setLoading(false)
  }
  }, [currentUser, resolvedParams.id])
  
  useEffect(()=> {
     if(resolvedParams.id){
        queueMicrotask(()=>{
            setPage(1);
            setPosts([]);
            fetchUser(1);
        })
     }
  }, [currentUser, fetchUser, resolvedParams.id])

  useEffect(()=> {
    if(page > 1){
        queueMicrotask(()=> {
            fetchUser(page)
        })
    }
  }, [fetchUser, page])

  const handleFollow = async () => {
    if(!currentUser?._id) return;
    try {
        const wasFollowing = isFollowing;
        setIsFollowing(!wasFollowing);
        setProfileUser(prev => prev ? {
            ...prev,
            followers: wasFollowing 
            ? prev.followers.filter(id => id !== currentUser._id)
            : [...prev.followers, currentUser._id]
        } : null)
        
        const {data} = await api.patch(`/user/${resolvedParams.id}/following`);
        if(data?.updateduser2){
            updateUser(data.updateduser2)
        }
        refreshPresence();

    } catch {
        setIsFollowing(!isFollowing)
    }
  }

  const openEditModal = () => {
    if(!profileUser) return;
    setEditName(profileUser.name || '');
    setEditBio(profileUser.bio || '');
    setEditImage(profileUser.imageUrl || '');
    setShowEditModal(true)
  }
 
  const handleSaveProfile = async () => {
    if(!editName.trim() || editSaving) return;
    setEditSaving(true);
    try {
        await api.patch(`/user/Update/${currentUser?._id}`, {
            name: editName,
            bio: editBio,
            imageUrl: editImage,
        })

        setProfileUser(prev => prev ? {...prev, name: editName, bio: editBio, imageUrl: editImage}: null)
        // update global auth store
        updateUser({...currentUser!, name: editName, bio: editBio, imageUrl: editImage})
        setShowEditModal(false)

    } catch {
        console.error("Faild to update profile");
    } finally {
        setEditSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(file){
        const base64 = await convertBase64(file);
        setEditImage(base64);
    }
  }

  const hasMore = page < numberOfPages;
  const isOwner = currentUser?._id === resolvedParams.id;

  if(!profileUser && !loading) {
    return <div className='p-8 text-center text-gray-500'>User not found</div>
  }


  return (
    <div className="scrollbar-none max-w-6xl mx-auto py-8 px-4 h-full overflow-y-auto">
        {/* Profile Header  */}
        {profileUser && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <div className='h-32 bg-linear-to-r from-indigo-500 to-purple-500 w-full relative'></div>
                <div className='px-6 pb-6 relative'>
                    <div className='flex justify-between items-end -mt-12 mb-4'>
                        {profileUser.imageUrl ? (
                            <img src={profileUser.imageUrl} className="w-24 h-24 rounded-full border-4 border-white bg-white object-cover shadow-sm" alt="" />
                            ): (
                                <div className="w-24 h-24 rounded-full border-4 border-white bg-indigo-100 flex justify-center items-center font-bold text-3xl text-indigo-700 shadow-sm">
                                    {profileUser.name?.charAt(0).toUpperCase()}
                                </div>
                            )}
                            
                            {isOwner ? (
                             <button onClick={openEditModal} className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2  hover:bg-gray-50 transition text-sm font-medium text-gray-700 cursor-pointer">
                                <Edit3 className="w-4 h-4" /> Edit Profile
                             </button>    
                            ): (
                                <div className="flex gap-3">
                                    <button onClick={handleFollow} className={`flex items-center gap-2 rounded-lg px-6 p-2 transition text-sm font-medium cursor-pointer ${isFollowing ? 'bg-gray-100 text-gray-800 hover:bg-gray-200': 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                        {isFollowing ? <><UserCheck className='w-4 h-4' />Following</> : <><UserPlus className='w-4 h-4' /> Follow</>}
                                    </button>
                                    <Link href="/chat" className="flex items-center justify-center border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition text-sm font-medium text-gray-700">
                                     Message
                                    </Link>
                                </div>
                            )}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">{profileUser.name}</h1>
                    <p className="text-gray-600 mt-2 max-w-xl">{profileUser.bio || 'This user hans no biogaphy yet.'}</p>

                    <div className='flex gap-6 mt-6'>
                        <div className='flex flex-col'>
                            <span className='text-xl font-bold text-gray-900'>{profileUser.following?.length || 0}</span>
                            <span className='text-sm text-gray-500'>Following</span>
                        </div>
                        <div className='flex flex-col'>
                            <span className='text-xl font-bold text-gray-900'>{profileUser.followers?.length || 0}</span>
                            <span className='text-sm text-gray-500'>Followers</span>
                        </div>                        
                    </div>
                </div>
            
            </div>
        )}

        {/* Posts  */}
        <div className='pb-32'>
          <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Posts</h2>

          <div className='mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
             {posts.map((post) => (
                <PostCard
                 key={post._id}
                 post={post}
                 onDelete={(id)=> setPosts(prev => prev.filter(p => p._id !== id))}
                 onUpdate={(updated) => setPosts(prev => prev.map(p => p._id === updated._id ? updated : p))}
                />
             ))}
          </div>
          {loading && (
            <div className='flex justify-center py-6'>
                <div className='h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600'></div>
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className='text-center py-12 bg-white rounded-xl border border-gray-50'>
                <p className='text-gray-400'>No posts yet.</p>
            </div>
          )}

          {!loading && hasMore && posts.length > 0 && (
            <button
             onClick={()=> setPage(p => p + 1)}
             className="w-full py-4 text-center text-indigo-600 font-medium hover:bg-indigo-50 rounded-xl transition"
             >
                Load more
            </button>
          )}
        </div>

        {/* Edit Profile Modal  */}
        {showEditModal && (
            <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4'>
             <div className='bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden'>
              <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
                  <h3 className='text-lg font-bold text-gray-900'>Edit Profile</h3>
                  <button onClick={() => setShowEditModal(false)} className='text-gray-400 hover:text-gray-600 transition' >
                    <X className='w-5 h-5' />
                  </button>
              </div>
              <div className='p-6 space-y-5'>
                {/* Avatar  */}
                <div className='flex items-center gap-4'>
                 <div className='relative'>
                  {editImage ? (
                    <img src={editImage} className='w-16 h-16 rounded-full object-cover border-2 border-gray-200' alt=''/>
                    ):(
                    <div className='w-16 h-1 rounded-full bg-indigo-100 flex items-center justify-center  text-2xl font-bold text-indigo-700'>
                        {editName?.charAt(0).toUpperCase() || "?"}
                    </div>
                    )}
                    <label className='absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-indigo-700 transition'>
                     <Camera className='w-3 h-3' />
                     <input type='file' className='hidden' accept='image/*' onChange={handleImageUpload} />
                    </label>
                 </div>
                 <div className='text-sm text-gray-500'>Upload a new profile photo</div>
                </div>
                <div >
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Name</label>
                    <input 
                     type='text'
                     value={editName}
                     onChange={e => setEditName(e.target.value)}
                     className='w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                    />
                </div>

                <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Bio</label>
                    <textarea 
                      value={editBio}
                      onChange={e => setEditBio(e.target.value)}
                      rows={3}
                      className='w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900  focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none'
                     placeholder='Tell People About yourself...'
                   />
                </div>
              </div>
              <div className='flex gap-3 justify-end px-6 py-4 border-t border-gray-100 bg-gray-50'>
                <button onClick={() => setShowEditModal(false)} className='px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition'>
                    Cancel
                </button>
                <button onClick={handleSaveProfile}
                    disabled={editSaving || !editName.trim()}
                    className='px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50'>
                    {editSaving ? 'Saving...': 'Save Changes'}
                </button>
              </div>
             </div>
            </div>
        )}

    </div>
  )


}







