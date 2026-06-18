import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Text, Switch, Button, Label, Badge, toast } from "@medusajs/ui"
import { useState } from "react"
import { adminFetch } from "../lib/api"

const ROOMS = [
  { slug: "backroom", name: "Backroom" },
  { slug: "vip",      name: "VIP"      },
  { slug: "reserve",  name: "Reserve"  },
  { slug: "special",  name: "Special"  },
  { slug: "unicorn",  name: "Unicorn"  },
]

type RoomState = {
  master:   boolean
  backroom: boolean
  vip:      boolean
  reserve:  boolean
  special:  boolean
  unicorn:  boolean
}

function fromMeta(meta: Record<string, unknown>): RoomState {
  return {
    master:   meta.master_backroom  === "true",
    backroom: meta.room_backroom    === "true",
    vip:      meta.room_vip         === "true",
    reserve:  meta.room_reserve     === "true",
    special:  meta.room_special     === "true",
    unicorn:  meta.room_unicorn     === "true",
  }
}

const ProductRoomWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const meta = (data.metadata ?? {}) as Record<string, unknown>
  const [state,   setState]  = useState<RoomState>(() => fromMeta(meta))
  const [saved,   setSaved]  = useState<RoomState>(() => fromMeta(meta))
  const [saving,  setSaving] = useState(false)

  const toggle = (key: keyof RoomState, val: boolean) =>
    setState(prev => ({ ...prev, [key]: val }))

  const unchanged = JSON.stringify(state) === JSON.stringify(saved)

  const activeRooms = ROOMS.filter(r => state[r.slug as keyof RoomState])

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminFetch(`/admin/products/${data.id}`, {
        method: "POST",
        body: JSON.stringify({
          metadata: {
            master_backroom: state.master   ? "true" : null,
            room_backroom:   state.backroom ? "true" : null,
            room_vip:        state.vip      ? "true" : null,
            room_reserve:    state.reserve  ? "true" : null,
            room_special:    state.special  ? "true" : null,
            room_unicorn:    state.unicorn  ? "true" : null,
          },
        }),
      })
      setSaved(state)
      toast.success("Room assignment saved")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Private Rooms</Heading>
          <Text size="xsmall" className="text-ui-fg-subtle mt-0.5">
            Hidden from main store and sitemap when Master Backroom is on.
          </Text>
        </div>
        {saved.master ? (
          <Badge color="orange" size="2xsmall">Private</Badge>
        ) : (
          <Badge color="green" size="2xsmall">Public</Badge>
        )}
      </div>

      {/* Master Backroom */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between rounded-lg border border-ui-border-base px-3 py-2.5">
          <div>
            <Label htmlFor="room-master" className="font-semibold">Master Backroom</Label>
            <Text size="xsmall" className="text-ui-fg-muted">
              Removes product from the main storefront. Can be enabled without assigning a room.
            </Text>
          </div>
          <Switch
            id="room-master"
            checked={state.master}
            onCheckedChange={v => toggle("master", v)}
          />
        </div>
      </div>

      {/* Room toggles */}
      <div className="flex flex-col gap-2 px-6 py-4">
        <Text size="xsmall" weight="plus" className="text-ui-fg-muted uppercase tracking-wide mb-1">
          Assign to Rooms
        </Text>
        <Text size="xsmall" className="text-ui-fg-subtle mb-2">
          A product can appear in any number of rooms simultaneously.
        </Text>
        {ROOMS.map(room => (
          <div
            key={room.slug}
            className="flex items-center justify-between rounded-lg border border-ui-border-base px-3 py-2"
          >
            <Label htmlFor={`room-${room.slug}`}>{room.name}</Label>
            <Switch
              id={`room-${room.slug}`}
              checked={state[room.slug as keyof RoomState] as boolean}
              onCheckedChange={v => toggle(room.slug as keyof RoomState, v)}
            />
          </div>
        ))}
      </div>

      {/* Status + save */}
      <div className="flex items-center justify-between px-6 py-4">
        <Text size="xsmall" className="text-ui-fg-subtle">
          {activeRooms.length === 0
            ? "Not assigned to any room"
            : `In: ${activeRooms.map(r => r.name).join(", ")}`}
        </Text>
        <Button
          size="small"
          onClick={handleSave}
          isLoading={saving}
          disabled={saving || unchanged}
        >
          Save
        </Button>
      </div>

    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductRoomWidget
