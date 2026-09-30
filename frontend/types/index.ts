export interface User {
    _id: string;
    name: string;
    email?: string;
    bio?: string;
    imageUrl?: string;
    followers: string[];
    following: string[];
}

export interface Comment {
    _id: string;
    postId: string;
    creator: string;
    value: string;
    createdAt: string;
    creator_name?: string;
    creator_avatar?: string;
}

export interface Post {
    _id: string;
    title: string;
    message: string;
    creator: string;
    selectedFile: string;
    name: string;
    creator_avatar?: string;
    creator_image?: string;
    creatorImage?: string;
    imageUrl?: string;
    likes: string[];
    comments: Comment[];
    createdAt: string;
}


export interface Notification {
    _id: string;
    deatils: string;
    mainuid: string;
    targetid: string;
    userid: string;
    isreded: boolean;
    createdAt: string;
    user?: {
        name: string;
        avatar: string;
    }
}

export interface AuthData {
    result: User;
    token: string;
}

export interface ChatMessage {
    _id: string;
    sender: string;
    recever: string;
    content: string;
    createdAt?: string;
}


export interface UnreadMsg {
    _id: string;
    mainUserid: string;
    otherUserid: string;
    numOfUnReadedMessages: number;
    isReaded: boolean;
}




