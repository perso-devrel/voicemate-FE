import { Asset } from 'expo-asset';
import type {
  DiscoverCandidate,
  MatchListItem,
  Message,
  SwipeResponse,
} from '@/types';

// Local dev images - require() returns numeric asset IDs at build time
const DEV_IMAGES = [
  require('../../assets/dev/1.jpg'),
  require('../../assets/dev/2.jpg'),
  require('../../assets/dev/3.jpg'),
  require('../../assets/dev/4.jpg'),
  require('../../assets/dev/5.jpg'),
];

let resolvedUris: string[] = [];

export async function loadDevImages(): Promise<void> {
  if (resolvedUris.length > 0) return;
  const assets = await Promise.all(
    DEV_IMAGES.map((img) => Asset.fromModule(img).downloadAsync()),
  );
  resolvedUris = assets.map((a) => a.localUri ?? a.uri);
}

function img(index: number): string {
  return resolvedUris[index] ?? '';
}

function makeCandidates(): DiscoverCandidate[] {
  return [
    {
      id: 'candidate-1',
      display_name: 'Yuki',
      birth_date: '1998-03-15',
      gender: 'female',
      nationality: 'JP',
      language: 'ja',
      bio: 'Tokyo based. Love hiking and photography!',
      interests: ['hiking', 'photography', 'coffee', 'travel'],
      photos: [img(0)],
    },
    {
      id: 'candidate-2',
      display_name: 'Emily',
      birth_date: '1996-07-22',
      gender: 'female',
      nationality: 'US',
      language: 'en',
      bio: 'Software engineer from SF. Looking to practice Korean!',
      interests: ['coding', 'K-pop', 'yoga', 'cooking'],
      photos: [img(1)],
    },
    {
      id: 'candidate-3',
      display_name: 'Liam',
      birth_date: '1995-11-08',
      gender: 'male',
      nationality: 'UK',
      language: 'en',
      bio: 'Music producer. Learning Japanese.',
      interests: ['music', 'gaming', 'anime', 'ramen'],
      photos: [img(2)],
    },
    {
      id: 'candidate-4',
      display_name: 'Mei',
      birth_date: '2000-01-30',
      gender: 'female',
      nationality: 'CN',
      language: 'zh',
      bio: null,
      interests: ['dance', 'fashion'],
      photos: [img(3)],
    },
    {
      id: 'candidate-5',
      display_name: 'Carlos',
      birth_date: '1997-05-12',
      gender: 'male',
      nationality: 'ES',
      language: 'es',
      bio: 'Architect and traveler. Interested in Korean culture.',
      interests: ['architecture', 'travel', 'food', 'movies'],
      photos: [img(4)],
    },
  ];
}

function makeMatches(): MatchListItem[] {
  return [
    {
      match_id: 'match-1',
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      partner: {
        id: 'candidate-1',
        display_name: 'Yuki',
        photos: [img(0)],
        nationality: 'JP',
        language: 'ja',
      },
      last_message: {
        id: 'msg-last-1',
        original_text: 'Nice to meet you! I love Korean food',
        sender_id: 'candidate-1',
        created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      },
      unread_count: 2,
    },
    {
      match_id: 'match-2',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      partner: {
        id: 'candidate-2',
        display_name: 'Emily',
        photos: [img(1)],
        nationality: 'US',
        language: 'en',
      },
      last_message: {
        id: 'msg-last-2',
        original_text: 'Can you teach me some Korean phrases?',
        sender_id: 'candidate-2',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
      unread_count: 0,
    },
    {
      match_id: 'match-3',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      partner: {
        id: 'candidate-3',
        display_name: 'Liam',
        photos: [img(2)],
        nationality: 'UK',
        language: 'en',
      },
      last_message: null,
      unread_count: 0,
    },
  ];
}

const DUMMY_MESSAGES: Record<string, Message[]> = {
  'match-1': [
    {
      id: 'msg-1',
      match_id: 'match-1',
      sender_id: 'dev-user',
      original_text: 'Hi Yuki! Nice to match with you.',
      original_language: 'en',
      translated_text: 'ゆきさん、マッチできて嬉しいです！',
      translated_language: 'ja',
      audio_url: null,
      audio_status: 'pending',
      read_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: 'msg-2',
      match_id: 'match-1',
      sender_id: 'candidate-1',
      original_text: 'はじめまして！韓国料理が大好きです',
      original_language: 'ja',
      translated_text: 'Nice to meet you! I love Korean food',
      translated_language: 'en',
      audio_url: null,
      audio_status: 'ready',
      read_at: null,
      created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
    {
      id: 'msg-3',
      match_id: 'match-1',
      sender_id: 'dev-user',
      original_text: 'What Korean food do you like the most?',
      original_language: 'en',
      translated_text: '一番好きな韓国料理は何ですか？',
      translated_language: 'ja',
      audio_url: null,
      audio_status: 'ready',
      read_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
    {
      id: 'msg-4',
      match_id: 'match-1',
      sender_id: 'candidate-1',
      original_text: 'ビビンバとトッポッキ！東京にも美味しいお店がたくさんあります',
      original_language: 'ja',
      translated_text: 'Bibimbap and tteokbokki! There are many delicious restaurants in Tokyo too.',
      translated_language: 'en',
      audio_url: null,
      audio_status: 'ready',
      read_at: null,
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
  ],
  'match-2': [
    {
      id: 'msg-5',
      match_id: 'match-2',
      sender_id: 'candidate-2',
      original_text: 'Hey! Can you teach me some Korean phrases?',
      original_language: 'en',
      translated_text: '안녕! 한국어 표현 좀 알려줄 수 있어?',
      translated_language: 'ko',
      audio_url: null,
      audio_status: 'ready',
      read_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
  ],
};

export function getDevResponse(path: string, method: string, body?: unknown): unknown {
  // GET /api/discover
  if (path.startsWith('/api/discover') && !path.includes('swipe') && method === 'GET') {
    return makeCandidates();
  }

  // POST /api/discover/swipe
  if (path.includes('/api/discover/swipe') && method === 'POST') {
    const swipeResponse: SwipeResponse = { direction: 'like', match: null };
    return swipeResponse;
  }

  // GET /api/matches
  if (path.startsWith('/api/matches') && !path.includes('/messages') && method === 'GET') {
    return makeMatches();
  }

  // GET /api/matches/:matchId/messages
  const msgMatch = path.match(/\/api\/matches\/([^/]+)\/messages/);
  if (msgMatch && method === 'GET') {
    const matchId = msgMatch[1];
    return (DUMMY_MESSAGES[matchId] ?? []).slice().reverse();
  }

  // POST /api/matches/:matchId/messages (send)
  const sendMatch = path.match(/\/api\/matches\/([^/]+)\/messages/);
  if (sendMatch && method === 'POST') {
    const parsed = typeof body === 'string' ? JSON.parse(body) : body;
    const msg: Message = {
      id: `msg-${Date.now()}`,
      match_id: sendMatch[1],
      sender_id: 'dev-user',
      original_text: parsed?.text ?? '',
      original_language: 'ko',
      translated_text: null,
      translated_language: null,
      audio_url: null,
      audio_status: 'pending',
      read_at: null,
      created_at: new Date().toISOString(),
    };
    return msg;
  }

  // PATCH /api/matches/:matchId/messages/read
  if (path.includes('/messages/read') && method === 'PATCH') {
    return { read_count: 0 };
  }

  // Default
  return [];
}
