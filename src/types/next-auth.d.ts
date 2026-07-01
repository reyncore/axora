import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id:       string
      username: string
      email:    string
      role:     "USER" | "ADMIN"
      name?:    string | null
      image?:   string | null
    }
  }

  interface User {
    id:       string
    username: string
    email:    string
    role:     "USER" | "ADMIN"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:                string
    username:          string
    role:              "USER" | "ADMIN"
    // Timestamp saat token diterbitkan — dibandingkan dengan passwordChangedAt di DB
    // untuk invalidate semua token lama saat password diganti
    issuedAtPassword:  number
  }
}
