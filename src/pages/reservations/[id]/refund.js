import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ReservationRefundPage() {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (!router.isReady) return;
    router.replace(id ? `/reservations/${id}` : "/bookings");
  }, [id, router]);

  return null;
}
