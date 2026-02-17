import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ROOM_TTL = 60 * 60 * 4; // 4 hours

export function roomKey(code) {
  return `c4:${code}`;
}

export async function getRoom(code) {
  const data = await redis.get(roomKey(code));
  return data || null;
}

export async function setRoom(code, state) {
  await redis.set(roomKey(code), state, { ex: ROOM_TTL });
}

export async function deleteRoom(code) {
  await redis.del(roomKey(code));
}
