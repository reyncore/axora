/**
 * lib/conversations.ts — Conversation helpers.
 *
 * CANONICAL ORDERING:
 * Conversation.user1Id/user2Id di-sort secara konsisten (string comparison)
 * agar @@unique([user1Id, user2Id]) bekerja terlepas dari siapa yang
 * memulai percakapan. Tanpa ini, A→B dan B→A bisa membuat dua row berbeda
 * untuk pasangan user yang sama.
 */

import { prisma } from "./prisma"

interface OrderedPair {
  userA: string
  userB: string
}

function orderUserIds(idA: string, idB: string): OrderedPair {
  return idA < idB
    ? { userA: idA, userB: idB }
    : { userA: idB, userB: idA }
}

/**
 * Cari atau buat conversation antara dua user.
 * Idempotent — memanggil ini berkali-kali untuk pasangan user yang sama
 * akan selalu return conversation yang sama.
 */
export async function findOrCreateConversation(userIdA: string, userIdB: string) {
  if (userIdA === userIdB) {
    throw new Error("Tidak bisa membuat conversation dengan diri sendiri")
  }

  const { userA, userB } = orderUserIds(userIdA, userIdB)

  const existing = await prisma.conversation.findUnique({
    where: { user1Id_user2Id: { user1Id: userA, user2Id: userB } },
  })

  if (existing) return existing

  return prisma.conversation.create({
    data: { user1Id: userA, user2Id: userB },
  })
}

/**
 * Cek apakah userId adalah participant dari conversation.
 * Dipakai untuk authorization check di setiap route.
 */
export function isParticipant(
  conversation: { user1Id: string; user2Id: string },
  userId: string,
): boolean {
  return conversation.user1Id === userId || conversation.user2Id === userId
}

/**
 * Dapatkan userId lawan bicara dari conversation.
 */
export function getOtherUserId(
  conversation: { user1Id: string; user2Id: string },
  currentUserId: string,
): string {
  return conversation.user1Id === currentUserId
    ? conversation.user2Id
    : conversation.user1Id
}
