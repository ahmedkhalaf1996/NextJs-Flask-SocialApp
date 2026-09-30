import {api} from '@/lib/api';
import {Post, User} from '@/types';

// getpost creator image
export const getPostCeatorImage = (post: Post, fallbackser?: User | null) => {
    return (
        post.creator_avatar ||
        post.creator_image ||
        post.creatorImage ||
        post.imageUrl ||
        (fallbackser?._id === post.creator ? fallbackser.imageUrl : '') ||
        ''
        
    );
};


// get commnet creator image
export const getCommentCreatorImage = (comment: {creator_avatar?: string}) => {
    return comment.creator_avatar || '';
}
// hydrate post creator images
export const hydratePostCreatorImages = async (posts: Post[], currentUser?: User | null) => {
    const creatorIds = Array.from(new Set(posts.map(post => post.creator).filter(Boolean)));
    const missingCreatorIds = creatorIds.filter((creatorId) => {
        if(currentUser?._id === creatorId && currentUser.imageUrl) return false;
        return posts.some(post => post.creator === creatorId && !getPostCeatorImage(post, currentUser));
    })

    if(missingCreatorIds.length === 0) {
        return posts.map(post=> (
            currentUser?._id === post.creator && currentUser.imageUrl 
            ? {...post, creator_avatar: getPostCeatorImage(post, currentUser)}
            : post
        ))
    }

    const creatorEntries = await Promise.all(
        missingCreatorIds.map(async (creatorId)=> {
            try {
              const {data} = await api.get('/user/getUser', {
                params: {
                    userid: creatorId,
                    withPosts: false,
                }
              });
              return [creatorId, data.user?.imageUrl || ''] as const;  
            } catch  {
                return [creatorId, ''] as const;
            }
        })
    );

    const creatorImages = new Map<string, string>(creatorEntries);
    if (currentUser?._id && currentUser.imageUrl) {
        creatorImages.set(currentUser._id, currentUser.imageUrl);
    }

    return posts.map(post => ({
        ...post,
        creator_avatar: getPostCeatorImage(post, currentUser) || creatorImages.get(post.creator) || '',
    }))
}