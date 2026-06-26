import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")

  if (!token || token.length < 32) {
    return NextResponse.redirect(
      new URL("/login?error=invalid-token", req.url)
    )
  }

  const user = await prisma.user.findFirst({
    where:  { verificationToken: token },
    select: {
      id:             true,
      emailVerified:  true,
      tokenExpiresAt: true,
    },
  })

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?error=invalid-token", req.url)
    )
  }

  if (user.emailVerified) {
    // Sudah verified sebelumnya — redirect ke login langsung
    return NextResponse.redirect(
      new URL("/login?verified=already", req.url)
    )
  }

  if (user.tokenExpiresAt && user.tokenExpiresAt < new Date()) {
    return NextResponse.redirect(
      new URL("/login?error=token-expired", req.url)
    )
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified:     true,
      verificationToken: null,
      tokenExpiresAt:    null,
    },
  })

  return NextResponse.redirect(
    new URL("/login?verified=1", req.url)
  )
}
