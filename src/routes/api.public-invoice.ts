import { createFileRoute } from "@tanstack/react-router";
import { getEncryptedDomainRecordById } from "@/lib/server/paymemo-db";

export const Route = createFileRoute("/api/public-invoice")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        if (!id) {
          return Response.json({ error: "Missing invoice id" }, { status: 400 });
        }

        const invoice = await getEncryptedDomainRecordById(id, "invoice");
        if (!invoice) {
          return Response.json({ error: "Invoice not found" }, { status: 404 });
        }

        if (invoice.status === "draft" || invoice.status === "cancelled") {
          return Response.json({ error: "Invoice not available" }, { status: 404 });
        }

        return Response.json({
          ok: true,
          invoice: {
            id: invoice.id,
            status: invoice.status,
            createdAt: invoice.createdAt,
            publicData: invoice.publicData,
          },
        });
      },
    },
  },
});
