import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { scrypt, timingSafeEqual, createHmac } from "crypto"
import { promisify } from "util"
import { BACKROOM_ACCESS_MODULE } from "../../../modules/backroom-access"

const VALID_ROOMS = ["master", "backroom", "vip", "reserve", "special", "unicorn"] as const
const scryptAsync = promisify(scrypt)

// ── In-memory per-IP rate limiter (Medusa runs as a persistent process) ────────
const MAX_ATTEMPTS = 20
const WINDOW_MS    = 15 * 60 * 1000
const attempts = new Map<string, { count: number; reset: number }>()

function clientIp(req: MedusaRequest): string {
  const fwd = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
  return fwd || req.socket?.remoteAddress || "unknown"
}
function isRateLimited(ip: string): boolean {
  const e = attempts.get(ip)
  return !!e && Date.now() < e.reset && e.count >= MAX_ATTEMPTS
}
function recordFailure(ip: string): void {
  const now = Date.now()
  const e = attempts.get(ip)
  if (!e || now > e.reset) attempts.set(ip, { count: 1, reset: now + WINDOW_MS })
  else e.count++
}
// Prune expired entries periodically so the map can't grow unbounded.
setInterval(() => {
  const now = Date.now()
  for (const [ip, e] of attempts) if (now > e.reset) attempts.delete(ip)
}, WINDOW_MS)

// Non-blocking scrypt verify (was scryptSync, which blocked the event loop on
// every login attempt and stalled all other Medusa requests).
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [salt, hash] = stored.split(":")
    const derived  = (await scryptAsync(password, salt, 64)) as Buffer
    const expected = Buffer.from(hash, "hex")
    if (derived.length !== expected.length) return false
    return timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

// Creates a standard HS256 JWT that jose can verify
function signJwt(payload: object, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const body   = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const sig     = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url")
  return `${header}.${body}.${sig}`
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ip = clientIp(req)
  if (isRateLimited(ip)) {
    return res.status(429).json({ message: "Too many attempts. Please try again later." })
  }

  const { room, password } = req.body as { room: string; password: string }

  if (!room || !VALID_ROOMS.includes(room as any)) {
    return res.status(400).json({ message: "Invalid room" })
  }
  if (!password) {
    return res.status(400).json({ message: "Password required" })
  }

  const service = req.scope.resolve(BACKROOM_ACCESS_MODULE) as any
  const rows = await service.listBackroomPasswords({ room_slug: room }, { take: 1 })

  if (!rows[0] || !(await verifyPassword(password, rows[0].password_hash))) {
    recordFailure(ip)
    return res.status(401).json({ message: "Incorrect password" })
  }

  const secret = process.env.BACKROOM_JWT_SECRET
  if (!secret) {
    return res.status(500).json({ message: "Server configuration error" })
  }

  attempts.delete(ip)  // successful login resets this IP's counter

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24  // 24 hours
  const token = signJwt({ room, iat: Math.floor(Date.now() / 1000), exp }, secret)

  res.json({ token })
}
