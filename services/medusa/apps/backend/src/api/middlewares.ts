import { authenticate, defineMiddlewares, MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

function importApiKeyMiddleware(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const apiKey = req.headers["x-api-key"] as string
  const expected = process.env.LUXUS_IMPORT_API_KEY

  if (!expected) {
    res.status(500).json({ message: "LUXUS_IMPORT_API_KEY is not configured on the server" })
    return
  }

  if (!apiKey || apiKey !== expected) {
    res.status(401).json({ message: "Invalid or missing X-Api-Key header" })
    return
  }

  next()
}

function elavonProxyMiddleware(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const secret = req.headers["x-elavon-proxy-secret"] as string
  const expected = process.env.ELAVON_PROXY_SECRET

  if (!expected) {
    res.status(500).json({ message: "ELAVON_PROXY_SECRET is not configured" })
    return
  }

  if (!secret || secret !== expected) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  next()
}

function storefrontRevalidateMiddleware(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const url = process.env.STOREFRONT_URL
  const secret = process.env.REVALIDATE_SECRET
  if (url && secret) {
    res.on("finish", () => {
      if (res.statusCode < 400) {
        fetch(`${url}/api/revalidate?secret=${secret}`, { method: "POST" }).catch(() => {})
      }
    })
  }
  next()
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/import/*",
      middlewares: [importApiKeyMiddleware],
    },
    {
      matcher: "/store/elavon/token",
      middlewares: [elavonProxyMiddleware],
    },
    {
      matcher: "/store/elavon/finalize",
      middlewares: [elavonProxyMiddleware],
    },
    {
      matcher: "/store/orders/by-email",
      middlewares: [authenticate("customer", ["bearer"])],
    },
    {
      matcher: "/admin/products*",
      methods: ["POST", "PUT", "DELETE"],
      middlewares: [storefrontRevalidateMiddleware],
    },
  ],
})
