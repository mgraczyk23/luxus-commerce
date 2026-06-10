import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import { Container, Heading, Button, Input, Label, Select } from "@medusajs/ui"
import { useState } from "react"
import { adminFetch } from "../lib/api"

type AdminOrder = { id: string; display_id?: number; email?: string }

const CARRIERS = ["UPS", "FedEx", "USPS", "DHL", "Other"]

const OrderNotificationsWidget = ({ data }: DetailWidgetProps<AdminOrder>) => {
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [paymentError, setPaymentError]   = useState("")

  const [shipOpen, setShipOpen]     = useState(false)
  const [carrier, setCarrier]       = useState("")
  const [tracking, setTracking]     = useState("")
  const [shipStatus, setShipStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [shipError, setShipError]   = useState("")

  async function sendPaymentReceived() {
    setPaymentStatus("sending")
    setPaymentError("")
    try {
      await adminFetch(`/admin/orders/${data.id}/notify`, {
        method: "POST",
        body: JSON.stringify({ type: "payment_received" }),
      })
      setPaymentStatus("sent")
    } catch (e: any) {
      setPaymentError(e.message ?? "Failed to send")
      setPaymentStatus("error")
    }
  }

  async function sendShipped() {
    setShipStatus("sending")
    setShipError("")
    try {
      await adminFetch(`/admin/orders/${data.id}/notify`, {
        method: "POST",
        body: JSON.stringify({ type: "shipped", carrier: carrier || undefined, tracking_number: tracking || undefined }),
      })
      setShipStatus("sent")
      setShipOpen(false)
    } catch (e: any) {
      setShipError(e.message ?? "Failed to send")
      setShipStatus("error")
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Customer Notifications</Heading>
      </div>

      {/* Payment received */}
      <div className="px-6 py-4">
        <p className="text-sm font-medium text-ui-fg-base mb-1">Payment Received</p>
        <p className="text-xs text-ui-fg-muted mb-3">
          Notifies the customer that payment has cleared and their order is being prepared.
        </p>
        {paymentStatus === "sent" ? (
          <p className="text-xs text-ui-fg-positive font-medium">✓ Payment confirmation sent to {data.email}</p>
        ) : (
          <>
            <Button
              size="small"
              variant="secondary"
              isLoading={paymentStatus === "sending"}
              disabled={paymentStatus === "sending"}
              onClick={sendPaymentReceived}
            >
              Send Payment Confirmation
            </Button>
            {paymentStatus === "error" && (
              <p className="text-xs text-ui-fg-error mt-1">{paymentError}</p>
            )}
          </>
        )}
      </div>

      {/* Shipped */}
      <div className="px-6 py-4">
        <p className="text-sm font-medium text-ui-fg-base mb-1">Order Shipped</p>
        <p className="text-xs text-ui-fg-muted mb-3">
          Notifies the customer their order is on the way. Include tracking info if available.
        </p>
        {shipStatus === "sent" ? (
          <p className="text-xs text-ui-fg-positive font-medium">✓ Shipping notification sent to {data.email}</p>
        ) : (
          <>
            {!shipOpen ? (
              <Button size="small" variant="secondary" onClick={() => setShipOpen(true)}>
                Mark as Shipped
              </Button>
            ) : (
              <div className="flex flex-col gap-3 mt-1">
                <div>
                  <Label htmlFor="carrier" className="text-xs mb-1 block">Carrier (optional)</Label>
                  <Select onValueChange={setCarrier} value={carrier}>
                    <Select.Trigger id="carrier">
                      <Select.Value placeholder="Select carrier…" />
                    </Select.Trigger>
                    <Select.Content>
                      {CARRIERS.map(c => (
                        <Select.Item key={c} value={c}>{c}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tracking" className="text-xs mb-1 block">Tracking Number (optional)</Label>
                  <Input
                    id="tracking"
                    placeholder="1Z999AA1012345678"
                    value={tracking}
                    onChange={e => setTracking(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="small"
                    isLoading={shipStatus === "sending"}
                    disabled={shipStatus === "sending"}
                    onClick={sendShipped}
                  >
                    Send Shipping Notice
                  </Button>
                  <Button size="small" variant="transparent" onClick={() => { setShipOpen(false); setShipError("") }}>
                    Cancel
                  </Button>
                </div>
                {shipStatus === "error" && (
                  <p className="text-xs text-ui-fg-error">{shipError}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default OrderNotificationsWidget
