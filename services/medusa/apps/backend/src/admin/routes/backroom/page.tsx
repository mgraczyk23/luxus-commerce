import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Input, Button, Badge, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { adminFetch } from "../../lib/api"

const ROOMS = [
  { slug: "master",   name: "Master Backroom", envVar: "BACKROOM_PASS_MASTER" },
  { slug: "backroom", name: "Backroom",         envVar: "BACKROOM_PASS_BACKROOM" },
  { slug: "vip",      name: "VIP",              envVar: "BACKROOM_PASS_VIP" },
  { slug: "reserve",  name: "Reserve",          envVar: "BACKROOM_PASS_RESERVE" },
  { slug: "special",  name: "Special",          envVar: "BACKROOM_PASS_SPECIAL" },
  { slug: "unicorn",  name: "Unicorn",          envVar: "BACKROOM_PASS_UNICORN" },
]

type RoomRow = { slug: string; has_password: boolean; input: string; saving: boolean; saved: boolean }

const BackroomPage = () => {
  const [rows, setRows] = useState<RoomRow[]>(
    ROOMS.map(r => ({ slug: r.slug, has_password: false, input: "", saving: false, saved: false }))
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminFetch<{ rooms: { slug: string; has_password: boolean }[] }>("/admin/backroom-passwords")
      .then(({ rooms }) => {
        setRows(prev =>
          prev.map(row => ({
            ...row,
            has_password: rooms.find(r => r.slug === row.slug)?.has_password ?? false,
          }))
        )
      })
      .catch(() => toast.error("Failed to load backroom passwords"))
      .finally(() => setLoading(false))
  }, [])

  const setInput = (slug: string, val: string) =>
    setRows(prev => prev.map(r => r.slug === slug ? { ...r, input: val, saved: false } : r))

  const handleSave = async (slug: string) => {
    const row = rows.find(r => r.slug === slug)
    if (!row?.input.trim()) return
    setRows(prev => prev.map(r => r.slug === slug ? { ...r, saving: true } : r))
    try {
      await adminFetch("/admin/backroom-passwords", {
        method: "POST",
        body: JSON.stringify({ room_slug: slug, password: row.input }),
      })
      setRows(prev =>
        prev.map(r => r.slug === slug ? { ...r, saving: false, saved: true, input: "", has_password: true } : r)
      )
      toast.success(`Password saved for ${ROOMS.find(r => r.slug === slug)?.name}`)
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save password")
      setRows(prev => prev.map(r => r.slug === slug ? { ...r, saving: false } : r))
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      <div>
        <Heading level="h1">Private Room Passwords</Heading>
        <Text className="text-ui-fg-muted mt-1">
          Manage access passwords for each private room.
        </Text>
      </div>

      {/* Fast-auth instructions */}
      <Container className="p-5 border border-ui-border-strong bg-ui-bg-subtle">
        <Text size="small" weight="plus" className="mb-2">
          ⚡ Fast Login — Vercel Environment Variables
        </Text>
        <Text size="xsmall" className="text-ui-fg-muted mb-3">
          Set these environment variables in your Vercel project dashboard for instant login
          (no server round-trip). Go to{" "}
          <span className="font-mono">vercel.com → Project → Settings → Environment Variables</span>.
        </Text>
        <div className="space-y-1">
          {ROOMS.map(r => (
            <div key={r.slug} className="flex items-center gap-2">
              <Text size="xsmall" className="font-mono text-ui-fg-base w-52">{r.envVar}</Text>
              <Text size="xsmall" className="text-ui-fg-muted">= your-password-here</Text>
            </div>
          ))}
        </div>
        <Text size="xsmall" className="text-ui-fg-muted mt-3">
          After adding env vars, redeploy the storefront. Login will be instant once deployed.
        </Text>
      </Container>

      {/* Legacy Medusa password storage (fallback if env vars not set) */}
      <div>
        <Text size="small" weight="plus" className="mb-1">Fallback Passwords (Medusa Database)</Text>
        <Text size="xsmall" className="text-ui-fg-muted mb-3">
          Used only if the Vercel env var for that room is not set. Slower due to secure hashing.
        </Text>
      </div>

      {loading ? (
        <Text className="text-ui-fg-muted">Loading…</Text>
      ) : (
        <div className="flex flex-col gap-3">
          {ROOMS.map(room => {
            const row = rows.find(r => r.slug === room.slug)!
            return (
              <Container key={room.slug} className="p-0">
                <div className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Text size="small" weight="plus">{room.name}</Text>
                      {row.has_password
                        ? <Badge size="2xsmall" color="green">Set</Badge>
                        : <Badge size="2xsmall" color="orange">Not set</Badge>
                      }
                      {row.saved && <Badge size="2xsmall" color="blue">Saved</Badge>}
                    </div>
                    <Text size="xsmall" className="text-ui-fg-muted font-mono">
                      /private/{room.slug}/login
                    </Text>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Input
                      type="password"
                      size="small"
                      placeholder={row.has_password ? "Change password…" : "Set password…"}
                      value={row.input}
                      onChange={e => setInput(room.slug, e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSave(room.slug)}
                      className="w-48"
                    />
                    <Button
                      size="small"
                      onClick={() => handleSave(room.slug)}
                      isLoading={row.saving}
                      disabled={!row.input.trim() || row.saving}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </Container>
            )
          })}
        </div>
      )}

      <Container className="p-5 bg-ui-bg-subtle">
        <Text size="small" weight="plus" className="mb-2">Access URLs</Text>
        <div className="space-y-1">
          {ROOMS.map(r => (
            <div key={r.slug} className="flex items-center gap-3">
              <Text size="xsmall" weight="plus" className="w-28 text-ui-fg-muted">{r.name}</Text>
              <Text size="xsmall" className="font-mono text-ui-fg-base">
                https://luxus-collection.com/private/{r.slug}
              </Text>
            </div>
          ))}
        </div>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Private Rooms",
})

export default BackroomPage
