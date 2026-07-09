import { useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useRouter } from "next/router";
import supabase from "../utils/supabase";

export default function ReservationsPage() {
  const router = useRouter();

  useEffect(() => {
    async function redirectToBookingQueue() {
      const { data } = await supabase.auth.getSession();
      router.replace(data.session ? "/bookings" : "/admin");
    }

    redirectToBookingQueue();
  }, [router]);

  return (
    <Box
      sx={{
        alignItems: "center",
        bgcolor: "background.default",
        display: "flex",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <CircularProgress />
    </Box>
  );
}
