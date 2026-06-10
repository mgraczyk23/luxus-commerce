import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Text, toast, Select, Textarea, Input } from "@medusajs/ui"
import { useState, useEffect } from "react"
import { adminFetch } from "../../lib/api"

type Restriction = {
  id: string
  state_code: string
  restriction_type: "banned" | "no_threaded_barrel" | "magazine_warning"
  notes: string | null
  magazine_limit: number | null
  firearm_type: string | null
}

const US_STATES = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
  ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],
  ["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],
  ["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],
  ["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],
  ["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],
  ["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],
  ["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],
  ["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],
  ["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
  ["DC","Washington D.C."],
]

const TYPE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  banned:             { label: "Banned",             color: "#8a4a4a", desc: "No sales to this state at all" },
  no_threaded_barrel: { label: "No Threaded Barrel", color: "#7a5a20", desc: "Block sale if product has a threaded barrel" },
  magazine_warning:   { label: "Magazine Limit",     color: "#3a6a8a", desc: "Ship firearm, exclude magazines exceeding state capacity limit" },
}

const FIREARM_LABELS: Record<string, string> = { handgun: "Handguns", rifle: "Rifles", shotgun: "Shotguns" }

function badgeText(r: Restriction): string {
  const base = TYPE_LABELS[r.restriction_type]?.label ?? r.restriction_type
  if (r.restriction_type !== "magazine_warning") return base
  const parts: string[] = []
  if (r.magazine_limit) parts.push(`≤${r.magazine_limit} rds`)
  if (r.firearm_type)   parts.push(FIREARM_LABELS[r.firearm_type] ?? r.firearm_type)
  return parts.length ? `${base} (${parts.join(", ")})` : base
}

export default function StateRestrictionsPage() {
  const [restrictions, setRestrictions] = useState<Restriction[]>([])
  const [loading,      setLoading]      = useState(true)
  const [adding,       setAdding]       = useState(false)
  const [newState,     setNewState]     = useState("")
  const [newType,      setNewType]      = useState("")
  const [newNotes,     setNewNotes]     = useState("")
  const [newMagLimit,  setNewMagLimit]  = useState("")
  const [newFirearm,   setNewFirearm]   = useState("")
  const [saving,       setSaving]       = useState(false)

  const load = () => {
    setLoading(true)
    adminFetch<{ restrictions: Restriction[] }>("/admin/state-restrictions")
      .then(d => setRestrictions(d.restrictions ?? []))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const resetForm = () => { setNewState(""); setNewType(""); setNewNotes(""); setNewMagLimit(""); setNewFirearm("") }

  const handleAdd = async () => {
    if (!newState || !newType) { toast.error("Select a state and restriction type"); return }
    if (newType === "magazine_warning" && !newMagLimit) { toast.error("Magazine limit is required for this restriction type"); return }
    if (newMagLimit && (isNaN(Number(newMagLimit)) || Number(newMagLimit) < 1)) { toast.error("Magazine limit must be a positive number"); return }
    setSaving(true)
    try {
      await adminFetch("/admin/state-restrictions", {
        method: "POST",
        body: JSON.stringify({
          state_code:       newState,
          restriction_type: newType,
          notes:            newNotes || undefined,
          magazine_limit:   newType === "magazine_warning" && newMagLimit ? Number(newMagLimit) : undefined,
          firearm_type:     newType === "magazine_warning" && newFirearm  ? newFirearm           : undefined,
        }),
      })
      toast.success("Restriction added")
      setAdding(false)
      resetForm()
      load()
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add restriction")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (r: Restriction) => {
    if (!confirm(`Remove "${badgeText(r)}" restriction for ${r.state_code}?`)) return
    try {
      await adminFetch(`/admin/state-restrictions/${r.id}`, { method: "DELETE" })
      toast.success("Restriction removed")
      load()
    } catch { toast.error("Failed to remove restriction") }
  }

  const grouped: Record<string, Restriction[]> = {}
  for (const r of restrictions) {
    if (!grouped[r.state_code]) grouped[r.state_code] = []
    grouped[r.state_code].push(r)
  }
  const sortedStates = Object.keys(grouped).sort()

  return (
    <div style={{ padding: "24px", maxWidth: "960px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <Heading level="h1">State Shipping Restrictions</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Control which states can receive which firearms. Changes take effect immediately on the storefront.
          </Text>
        </div>
        {!adding && <Button size="small" onClick={() => setAdding(true)}>Add Restriction</Button>}
      </div>

      {/* Legend */}
      <Container className="mb-6 p-4">
        <Text size="small" weight="plus" className="mb-3 block">Restriction Types</Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
          {Object.entries(TYPE_LABELS).map(([key, { label, color, desc }]) => (
            <div key={key} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span style={{ marginTop: "2px", padding: "2px 8px", background: color + "22", border: `1px solid ${color}55`, borderRadius: "3px", fontSize: "10px", fontWeight: 600, color, whiteSpace: "nowrap" }}>{label}</span>
              <Text size="xsmall" className="text-ui-fg-subtle">{desc}</Text>
            </div>
          ))}
        </div>
      </Container>

      {/* Add form */}
      {adding && (
        <Container className="mb-6 p-5">
          <Text size="small" weight="plus" className="mb-4 block">New Restriction</Text>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <Text size="xsmall" className="text-ui-fg-subtle mb-1.5 block">State *</Text>
              <Select value={newState} onValueChange={setNewState}>
                <Select.Trigger><Select.Value placeholder="Select state…" /></Select.Trigger>
                <Select.Content>
                  {US_STATES.map(([code, name]) => (
                    <Select.Item key={code} value={code}>{code} — {name}</Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div>
              <Text size="xsmall" className="text-ui-fg-subtle mb-1.5 block">Restriction Type *</Text>
              <Select value={newType} onValueChange={v => { setNewType(v); setNewMagLimit(""); setNewFirearm("") }}>
                <Select.Trigger><Select.Value placeholder="Select type…" /></Select.Trigger>
                <Select.Content>
                  <Select.Item value="banned">Banned — no sales at all</Select.Item>
                  <Select.Item value="no_threaded_barrel">No Threaded Barrel — block if product has threaded barrel</Select.Item>
                  <Select.Item value="magazine_warning">Magazine Limit — ship without magazines over the limit</Select.Item>
                </Select.Content>
              </Select>
            </div>
          </div>

          {newType === "magazine_warning" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px", padding: "14px", background: "var(--medusa-bg-subtle)", borderRadius: "4px", border: "1px solid var(--medusa-border-base)" }}>
              <div>
                <Text size="xsmall" className="text-ui-fg-subtle mb-1.5 block">Magazine Limit (rounds) *</Text>
                <Input
                  type="number" min={1} max={200} placeholder="e.g. 15"
                  value={newMagLimit} onChange={e => setNewMagLimit(e.target.value)}
                />
                <Text size="xsmall" className="text-ui-fg-subtle mt-1 block">
                  Warning fires only if the product's magazine capacity exceeds this number.
                </Text>
              </div>
              <div>
                <Text size="xsmall" className="text-ui-fg-subtle mb-1.5 block">Applies To</Text>
                <Select value={newFirearm} onValueChange={setNewFirearm}>
                  <Select.Trigger><Select.Value placeholder="All firearms (default)" /></Select.Trigger>
                  <Select.Content>
                    <Select.Item value="">All firearms</Select.Item>
                    <Select.Item value="handgun">Handguns only</Select.Item>
                    <Select.Item value="rifle">Rifles only</Select.Item>
                    <Select.Item value="shotgun">Shotguns only</Select.Item>
                  </Select.Content>
                </Select>
                <Text size="xsmall" className="text-ui-fg-subtle mt-1 block">
                  For states with different limits by type (e.g. IL: rifles ≤10, handguns ≤15), add two separate rules.
                </Text>
              </div>
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <Text size="xsmall" className="text-ui-fg-subtle mb-1.5 block">Notes (optional)</Text>
            <Textarea
              value={newNotes} onChange={e => setNewNotes(e.target.value)}
              placeholder="e.g. Handgun roster law, AWB, magazine limit law…"
              rows={2}
            />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button size="small" onClick={handleAdd} isLoading={saving} disabled={saving}>Save Restriction</Button>
            <Button size="small" variant="secondary" onClick={() => { setAdding(false); resetForm() }}>Cancel</Button>
          </div>
        </Container>
      )}

      {/* Table */}
      {loading ? (
        <Text size="small" className="text-ui-fg-subtle">Loading…</Text>
      ) : sortedStates.length === 0 ? (
        <Container className="p-8 text-center">
          <Text size="small" className="text-ui-fg-subtle">No restrictions configured. All states are open for sales.</Text>
        </Container>
      ) : (
        <Container className="p-0 overflow-hidden">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--medusa-border-base)" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--medusa-fg-subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>State</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--medusa-fg-subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Restrictions</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--medusa-fg-subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {sortedStates.map((code, i) => {
                const stateName = US_STATES.find(([c]) => c === code)?.[1] ?? code
                const rows = grouped[code]
                return (
                  <tr key={code} style={{ borderBottom: "1px solid var(--medusa-border-base)", background: i % 2 === 0 ? "transparent" : "var(--medusa-bg-subtle)" }}>
                    <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                      <Text size="small" weight="plus">{code}</Text>
                      <Text size="xsmall" className="text-ui-fg-subtle">{stateName}</Text>
                    </td>
                    <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {rows.map(r => {
                          const t = TYPE_LABELS[r.restriction_type] ?? { label: r.restriction_type, color: "#707076" }
                          return (
                            <span key={r.id} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "2px 8px", background: t.color + "22", border: `1px solid ${t.color}55`, borderRadius: "3px", fontSize: "11px", fontWeight: 500, color: t.color }}>
                              {badgeText(r)}
                              <button onClick={() => handleDelete(r)} style={{ background: "none", border: "none", cursor: "pointer", color: t.color, lineHeight: 1, padding: "0 0 0 2px", fontSize: "13px", opacity: 0.7 }} title="Remove">×</button>
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        {rows.map(r => r.notes).filter(Boolean).join(" · ") || "—"}
                      </Text>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Container>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "State Restrictions",
  icon: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 1L13 4V8C13 11.3 10.6 13.8 7.5 14.5C4.4 13.8 2 11.3 2 8V4L7.5 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M5 7.5L6.8 9.5L10 6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
})
