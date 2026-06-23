import { getActiveProductionOrders } from "@/lib/production-data";
import { TelegramUI } from "./telegram-ui";

export const dynamic = "force-dynamic";

export default async function TelegramMiniAppHome() {
  const activeOrders = await getActiveProductionOrders();

  return (
    <TelegramUI initialOrders={activeOrders} />
  );
}
