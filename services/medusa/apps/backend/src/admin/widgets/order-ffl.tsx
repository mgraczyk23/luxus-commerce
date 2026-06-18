import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import { Badge, Container, Heading, Text } from "@medusajs/ui"

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

function AddressRow({ label, lines }: { label: string; lines: string[] }) {
  const nonEmpty = lines.filter(Boolean)
  return (
    <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
      <Text size="small" leading="compact" weight="plus">
        {label}
      </Text>
      {nonEmpty.length > 0 ? (
        <Text size="small" leading="compact">
          {nonEmpty.map((line, i) => (
            <span className="break-words" key={i}>
              {line}
              {i < nonEmpty.length - 1 && <br />}
            </span>
          ))}
        </Text>
      ) : (
        <Text size="small" leading="compact" className="text-ui-fg-muted">
          —
        </Text>
      )}
    </div>
  )
}

const OrderFflWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const meta = (order.metadata ?? {}) as Record<string, string>

  const fflName  = meta.ffl_dealer_name    ?? ""
  const fflAddr1 = meta.ffl_dealer_address1 ?? ""
  const fflCity  = meta.ffl_dealer_city    ?? ""
  const fflState = meta.ffl_dealer_state   ?? ""
  const fflZip   = meta.ffl_dealer_zip     ?? ""
  const isManual = meta.ffl_is_manual === "true"

  const buyerAddr1 = meta.buyer_address1 ?? order.shipping_address?.address_1 ?? ""
  const buyerCity  = meta.buyer_city     ?? order.shipping_address?.city       ?? ""
  const buyerState = meta.buyer_state    ?? order.shipping_address?.province   ?? ""
  const buyerZip   = meta.buyer_zip      ?? order.shipping_address?.postal_code ?? ""

  const fflCityLine = [fflCity, fflState].filter(Boolean).join(", ") + (fflZip ? ` ${fflZip}` : "")
  const buyerCityLine = [buyerCity, buyerState?.toUpperCase()].filter(Boolean).join(", ") + (buyerZip ? ` ${buyerZip}` : "")

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">FFL Transfer</Heading>
        {isManual && (
          <Badge size="2xsmall" color="grey">Manual entry</Badge>
        )}
      </div>

      <AddressRow
        label="FFL dealer"
        lines={[fflName, fflAddr1, fflCityLine].filter(Boolean)}
      />

      <AddressRow
        label="Buyer address"
        lines={[buyerAddr1, buyerCityLine].filter(Boolean)}
      />
    </Container>
  )
}

export default OrderFflWidget

export const config = defineWidgetConfig({
  zone: "order.details.side.before",
})
