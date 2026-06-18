import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { scryptSync, randomBytes, timingSafeEqual } from "crypto"
import { BACKROOM_ACCESS_MODULE } from "../../../modules/backroom-access"

const VALID_ROOMS = ["master", "backroom", "vip", "reserve", "special", "unicorn"] as const

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${hash}`
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(BACKROOM_ACCESS_MODULE) as any
  const rows = await service.listBackroomPasswords({}, { take: 20 })

  const bySlug: Record<string, boolean> = {}
  for (const r of rows) bySlug[r.room_slug] = true

  res.json({
    rooms: VALID_ROOMS.map(slug => ({
      slug,
      has_password: !!bySlug[slug],
    })),
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { room_slug, password } = req.body as { room_slug: string; password: string }

  if (!VALID_ROOMS.includes(room_slug as any)) {
    return res.status(400).json({ message: "Invalid room slug" })
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ message: "Password must be at least 4 characters" })
  }

  const service = req.scope.resolve(BACKROOM_ACCESS_MODULE) as any
  const existing = await service.listBackroomPasswords({ room_slug }, { take: 1 })
  const password_hash = hashPassword(password)

  if (existing[0]) {
    await service.updateBackroomPasswords([{ id: existing[0].id, password_hash }])
  } else {
    await service.createBackroomPasswords([{ room_slug, password_hash }])
  }

  res.json({ ok: true })
}
