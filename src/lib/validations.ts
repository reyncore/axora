import { z } from "zod"

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export const registerSchema = z.object({
  email: z.string().email("Email tidak valid"),
  username: z
    .string()
    .min(3,  "Minimal 3 karakter")
    .max(30, "Maksimal 30 karakter")
    .regex(/^[a-zA-Z0-9_]+$/, "Hanya huruf, angka, dan underscore"),
  displayName: z.string().min(2, "Minimal 2 karakter").max(50, "Maksimal 50 karakter"),
  password: z
    .string()
    .min(8,  "Minimal 8 karakter")
    .regex(/[A-Z]/, "Harus ada huruf kapital")
    .regex(/[0-9]/, "Harus ada angka"),
})

export const createPostSchema = z.object({
  content: z
    .string()
    .min(1,   "Post tidak boleh kosong")
    .max(500, "Maksimal 500 karakter")
    .trim(),
  mediaIds: z.array(z.string().cuid()).max(4, "Maksimal 4 foto").optional(),
})

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1,   "Komentar tidak boleh kosong")
    .max(280, "Maksimal 280 karakter")
    .trim(),
})

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio:         z.string().max(160).optional(),
  avatarUrl:   z.string().url().optional().nullable(),
  bannerUrl:   z.string().url().optional().nullable(),
})

export type LoginInput         = z.infer<typeof loginSchema>
export type RegisterInput      = z.infer<typeof registerSchema>
export type CreatePostInput    = z.infer<typeof createPostSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, "Pesan tidak boleh kosong").max(2000, "Maksimal 2000 karakter"),
})
