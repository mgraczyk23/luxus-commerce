import { defineMiddlewares, MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

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

export default defineMiddlewares({
  routes: [
    {
      matcher: "/import/*",
      middlewares: [importApiKeyMiddleware],
    },
  ],
})
