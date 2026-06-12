import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import { Container, Heading, Text } from "@medusajs/ui"

type AdminOrder = {
  id: string
  metadata?: Record<string, unknown>
  shipping_address?: {
    first_name?: string
    last_name?: string
    address_1?: string
    city?: string
    province?: string
    postal_code?: string
  }
}

const OrderFflWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const meta = (order.metadata ?? {}) as Record<string, string>

  const fflName    = meta.ffl_dealer_name    ?? ""
  const fflAddr1   = meta.ffl_dealer_address1 ?? ""
  const fflCity    = meta.ffl_dealer_city    ?? ""
  const fflState   = meta.ffl_dealer_state   ?? ""
  const fflZip     = meta.ffl_dealer_zip     ?? ""
  const isManual   = meta.ffl_is_manual === "true"

  const buyerAddr1 = meta.buyer_address1 ?? order.shipping_address?.address_1 ?? ""
  const buyerCity  = meta.buyer_city     ?? order.shipping_address?.city       ?? ""
  const buyerState = meta.buyer_state    ?? order.shipping_address?.province   ?? ""
  const buyerZip   = meta.buyer_zip      ?? order.shipping_address?.postal_code ?? ""

  const hasFfl = !!(fflName || fflAddr1)

  return (
    <Container className="divide-y p-0">
      {/* FFL Transfer Destination */}
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">FFL Transfer Destination</Heading>
        {isManual && (
          <span className="text-xs font-medium text-ui-fg-muted bg-ui-bg-subtle px-2 py-1 rounded">Manual entry</span>
        )}
      </div>

      {hasFfl ? (
        <div className="px-6 py-4">
          <div
            style={{
              background: "#fffdf7",
              border: "1px solid #e8c97a",
              borderLeft: "3px solid #c9a96e",
              padding: "14px 16px",
              borderRadius: "2px",
            }}
          >
            <p style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a96e", fontWeight: 600, margin: "0 0 6px" }}>
              Ship Firearm To
            </p>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", margin: "0 0 3px" }}>{fflName}</p>
            {fflAddr1 && (
              <p style={{ fontSize: "13px", color: "#525258", margin: "0", lineHeight: 1.6 }}>
                {fflAddr1}<br />
                {[fflCity, fflState].filter(Boolean).join(", ")}{fflZip ? ` ${fflZip}` : ""}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-muted text-sm">No FFL dealer on file for this order.</Text>
        </div>
      )}

      {/* Buyer address clarification */}
      {buyerAddr1 && (
        <>
          <div className="px-6 py-4">
            <p style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#9e9994", fontWeight: 500, margin: "0 0 6px" }}>
              Buyer Address (Billing)
            </p>
            <p style={{ fontSize: "13px", color: "#525258", margin: 0, lineHeight: 1.6 }}>
              {buyerAddr1}<br />
              {[buyerCity, buyerState?.toUpperCase()].filter(Boolean).join(", ")}{buyerZip ? ` ${buyerZip}` : ""}
            </p>
          </div>
        </>
      )}
    </Container>
  )
}

export default OrderFflWidget

export const config = defineWidgetConfig({
  zone: "order.details.side.before",
})
