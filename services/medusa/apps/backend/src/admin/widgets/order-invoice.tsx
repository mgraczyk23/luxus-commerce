import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import { Container, Heading, Button } from "@medusajs/ui"
import { useNavigate } from "react-router-dom"

type AdminOrder = { id: string; display_id?: number }

const OrderInvoiceWidget = ({ data }: DetailWidgetProps<AdminOrder>) => {
  const navigate = useNavigate()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Invoice</Heading>
          <p className="text-xs text-ui-fg-muted mt-0.5">
            Print or download a Luxus Collection invoice for this order.
          </p>
        </div>
        <Button
          size="small"
          variant="secondary"
          onClick={() => navigate(`/orders/${data.id}/invoice`)}
        >
          Print Invoice
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.before",
})

export default OrderInvoiceWidget
