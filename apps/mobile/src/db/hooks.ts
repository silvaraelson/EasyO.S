import { useEffect, useState } from "react";
import { Q } from "@nozbe/watermelondb";
import { database } from "./database";
import { ServiceOrder } from "./models/ServiceOrder";

export function useServiceOrders() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);

  useEffect(() => {
    const subscription = database
      .get<ServiceOrder>("service_orders")
      .query(Q.sortBy("scheduled_at", Q.asc))
      .observe()
      .subscribe(setOrders);

    return () => subscription.unsubscribe();
  }, []);

  return orders;
}

export function useServiceOrder(id: string) {
  const [order, setOrder] = useState<ServiceOrder | null>(null);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;
    let cancelled = false;

    database
      .get<ServiceOrder>("service_orders")
      .find(id)
      .then((record) => {
        if (cancelled) return;
        subscription = record.observe().subscribe(setOrder);
      })
      .catch(() => setOrder(null));

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [id]);

  return order;
}
