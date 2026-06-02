import { useEffect } from "react";
import { useRouter } from "next/router";

export default function CustomersPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/pending");
  }, [router]);

  return null;
}
