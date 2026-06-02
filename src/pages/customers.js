import { useEffect } from "react";
import { useRouter } from "next/router";

export default function CustomersPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/bookings");
  }, [router]);

  return null;
}
