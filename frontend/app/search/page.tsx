'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Post, User } from '@/types';
import PostCard from '@/components/ui/PostCard';
import { Search as SearchIcon, Users, FileText } from 'lucide-react';
import Link from 'next/link';
import { hydratePostCreatorImages } from '@/lib/posts';
import { useAuthStore } from '@/lib/store/useAuthStore';

type SearchFilter = 'all' | 'users' | 'posts' ;

export default function SearchPage (){

  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState(1);
  const [results, setResults] = useState<{ posts: Post[], users: User[] } | null>(null);


  const mergeUniqueUsers = (previous: User[], next: User[]) => {
    const usersById = new Map<string, User>();
    [...previous, ...next].forEach((nextUser) => {
        if(nextUser._id !== user?._id){
            usersById.set(nextUser._id, nextUser);
        }
    });
    return Array.from(usersById.values());
  }

  const mergeUniquePosts= (previous: Post[], next: Post[]) => {
    const postsById = new Map<string, Post>();
    [...previous, ...next].forEach((post) => {
       postsById.set(post._id, post);
    });
    return Array.from(postsById.values());
  }

   const runSearch = async (pageNum: number, mode: 'replace' | 'append') => {
    const searchtext = query.trim();
    if(!searchtext) return;

    setLoading(true);
    try {
        const {data} = await api.get('/posts/search', {
            params: {
                searchQuery: searchtext,
                page: pageNum,
                id: user?._id,
            }
        });

        const posts = await hydratePostCreatorImages(data.posts || [], user);
        const users = (data.users || data.user || []).filter((nextUser: User)=> nextUser._id !== user?._id);

        setResults(prev => {
            if (mode === 'append' && prev){
                return {
                    posts: mergeUniquePosts(prev.posts, posts),
                    users: mergeUniqueUsers(prev.users, users),
                }
            }
            return {posts, users};
        });
        setSearchedQuery(searchtext);
        setPage(pageNum);
        setNumberOfPages(data.numberOfPages || 1);

    } catch {
        console.error("Search failed")
    } finally {
        setLoading(false)
    }
   };

   const handleSearch = async(e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(1, 'replace');
   }

   const handleLoadMore = async  () => {
    if(loading || page >= numberOfPages) return;
    await runSearch(page +1 , 'append');
   };

   const hasMore = page < numberOfPages;

   return (
    <div className='scrollbar-none max-w-4xl mx-auto py-8 px-4 h-full overflow-y-auto'>
     <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 text-center'>
      <h1 className='text-3xl font-bold text-gray-900 mb-6'>Search</h1>
      <form onSubmit={handleSearch} className='max-w-2xl mx-auto relative' >
       <input 
        type='text'
        placeholder='Search for people, posts, topics...'
        className='w-full bg-gray-50 border border-gray-200 text-gra-900 rounded-full px-6 py-4 pr-14 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white  transition shadow-inner'
        value={query}
        onChange={(e)=> setQuery(e.target.value)}
       />
       <button type='submit' disabled={loading || !query.trim()} className='absolute right-3 top-3 w-10 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition disabled:opacity-50' >
        {loading ? <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin'></div> : <SearchIcon className='w-5 h-5' />}
       </button>
      </form>
      <div className='mt-5 inline-flex rounded-full bg-gray-100 p-1'>
         {[
            {key: 'all', label: 'All'},
            {key: 'users', label: 'Users'},
            {key: 'posts', label: 'Posts'},
         ].map((item) => (
            <button key={item.key} type='button' onClick={()=> setFilter(item.key as SearchFilter )}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === item.key ? 'bg-white text-indigo-600 shadow-sm': 'text-gray-500 hover:text-gray-700'}`}>
               {item.label}
            </button>
         ))}
      </div>
     </div>

     {results && (
        <div className='space-y-12 pb-32'>
            {(filter === 'all' || filter === 'users') && <div>
                <h2 className='text-xl font-bold text-gray-900 mb-6 flex items-center gap-2'>
                 <Users className='w-5 h-5 text-indigo-600' /> People matching &quot; {searchedQuery} &quot; 
                </h2>
                {results.users.length === 0 ? (
                    <p className='text-gray-500 bg-white p-6 rounded-xl border border-gray-100 text-center'>No users found.</p>
                    ) : (
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            {results.users.map((u)=> (
                                <Link key={u._id} href={`/profile/${u._id}`} className='bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:border-indigo-300 transition group'>
                                    {u.imageUrl ? (
                                        <img src={u.imageUrl} className='w-14 h-14 rounded-full object-cover ring-2  ring-indigo-50' alt=''/>
                                    ): (
                                        <div className='w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-700'>
                                            {u.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className='font-semibold text-gray-900 group-hover:text-indigo-600 transition'>{u.name}</h3>
                                        <p className='text-sm text-gray-500 line-clamp-1'>{u.bio || 'New member'}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
            </div>}
            {(filter === 'all' || filter === 'posts') && <div>
             <h2 className='text-xl font-bold text-gray-900 mb-6 flex items-center gap-2'>
              <FileText className='w-5 h-5 text-indigo-600' /> Posts &quot; {searchedQuery}&quot;    
            </h2>  

            {results.posts.length === 0 ? (
                <p className='text-gray-500 bg-white p-6 rounded-xl border border-gray-100 text-center'>
                    No Posts found.
                </p>
                ) : (
                    <div className='space-y-6 max-w-2xl mx-auto'>
                        {results.posts.map((post) => (
                            <PostCard key={post._id} post={post} />
                        ))}
                    </div>
                )}  
            </div>}

            {hasMore && (
                <button type='button' onClick={handleLoadMore} disabled={loading}
                className='w-full rounded-xl py-4 text-center font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50'>
                    {loading ? 'Loading...': 'Load more results'}
                </button>
            )}
        </div>
     )}
    </div>
   )


}


