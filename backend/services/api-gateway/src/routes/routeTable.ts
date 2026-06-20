import { Role } from '../utils/roles';
import { ServiceName } from '../config/env';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface RouteRule {
  method: HttpMethod;
  path: string;
  target: ServiceName;
  auth: 'public' | 'required';
  roles?: Role[];
  selfParam?: string;
  bypassRoles?: Role[];
}

export const routeTable: RouteRule[] = [
  // Auth
  { method: 'post', path: '/api/auth/register', target: 'auth', auth: 'public' },
  { method: 'post', path: '/api/auth/login', target: 'auth', auth: 'public' },
  { method: 'post', path: '/api/auth/refresh', target: 'auth', auth: 'public' },
  { method: 'post', path: '/api/auth/logout', target: 'auth', auth: 'public' },
  { method: 'get', path: '/api/auth/verify', target: 'auth', auth: 'public' },
  { method: 'patch', path: '/api/auth/password', target: 'auth', auth: 'required' },
  { method: 'patch', path: '/api/auth/email', target: 'auth', auth: 'required' },


  // Users
  { method: 'get', path: '/api/users/username/:username/public', target: 'user', auth: 'required' },
  { method: 'get', path: '/api/users/:id/public', target: 'user', auth: 'required' },
  { method: 'get', path: '/api/users/:id', target: 'user', auth: 'required' },
  { method: 'get', path: '/api/users/search', target: 'user', auth: 'required' },
  { method: 'put', path: '/api/users/:id', target: 'user', auth: 'required', selfParam: 'id', bypassRoles: ['admin'] },
  { method: 'delete', path: '/api/users/:id', target: 'user', auth: 'required', selfParam: 'id', bypassRoles: ['admin'] },
  //{ method: 'patch', path: '/api/users/:id/ban', target: 'user', auth: 'required', roles: ['admin'] },
  { method: 'patch', path: '/api/users/:id/role', target: 'user', auth: 'required', roles: ['admin'] },

  // Posts
  { method: 'post', path: '/api/posts', target: 'post', auth: 'required' },
  { method: 'get', path: '/api/posts/tags/:tag', target: 'post', auth: 'required' },
  { method: 'get', path: '/api/posts', target: 'post', auth: 'required' },
  { method: 'get', path: '/api/posts/feed', target: 'post', auth: 'required' },
  { method: 'get', path: '/api/posts/:id', target: 'post', auth: 'required' },
  { method: 'get', path: '/api/posts/:id/replies', target: 'post', auth: 'required' },
  { method: 'get', path: '/api/posts/search', target: 'post', auth: 'required' },
  { method: 'put', path: '/api/posts/:id', target: 'post', auth: 'required' },
  { method: 'delete', path: '/api/posts/:id', target: 'post', auth: 'required' },

  // Comments
  { method: 'post', path: '/api/comments', target: 'post', auth: 'required' },
  { method: 'get', path: '/api/comments/tags/:tag', target: 'post', auth: 'required' },
  { method: 'get', path: '/api/comments/post/:postId', target: 'post', auth: 'required' },
  { method: 'get', path: '/api/comments/user/:userId', target: 'post', auth: 'required' },
  { method: 'get', path: '/api/comments/:id/replies', target: 'post', auth: 'required' },
  { method: 'get', path: '/api/comments/search', target: 'post', auth: 'required' },
  { method: 'put', path: '/api/comments/:id', target: 'post', auth: 'required' },
  { method: 'delete', path: '/api/comments/:id', target: 'post', auth: 'required' },

  // Post likes
  { method: 'post', path: '/api/post-likes', target: 'post', auth: 'required' },
  { method: 'delete', path: '/api/post-likes', target: 'post', auth: 'required' },
  { method: 'get', path: '/api/post-likes/user/:userId', target: 'post', auth: 'required' },
  { method: 'get', path: '/api/post-likes/post/:postId', target: 'post', auth: 'required' },

  // Comment likes
  { method: 'post', path: '/api/comment-likes', target: 'post', auth: 'required' },
  { method: 'delete', path: '/api/comment-likes', target: 'post', auth: 'required' },
  { method: 'get', path: '/api/comment-likes/user/:userId', target: 'post', auth: 'required' },
  { method: 'get', path: '/api/comment-likes/comment/:commentId', target: 'post', auth: 'required' },

  // Profile
  { method: 'post', path: '/api/profile/follow', target: 'profile', auth: 'required' },
  { method: 'post', path: '/api/profile/unfollow', target: 'profile', auth: 'required' },
  { method: 'delete', path: '/api/profile/follow', target: 'profile', auth: 'required' },

  { method: 'get', path: '/api/profile/:userId/followers', target: 'profile', auth: 'required' },
  { method: 'get', path: '/api/profile/:userId/following', target: 'profile', auth: 'required' },

  { method: 'post', path: '/api/profile', target: 'profile', auth: 'required' },
  { method: 'get', path: '/api/profile/:userId', target: 'profile', auth: 'required' },
  { method: 'put', path: '/api/profile/:userId', target: 'profile', auth: 'required', selfParam: 'userId', bypassRoles: ['admin'] },
  { method: 'delete', path: '/api/profile/:userId', target: 'profile', auth: 'required', selfParam: 'userId', bypassRoles: ['admin'] },
  
  // Media
  { method: 'post', path: '/api/media', target: 'media', auth: 'required' },
  { method: 'delete', path: '/api/media/:objectName', target: 'media', auth: 'required' },

];
