import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Alert, Box, Button, Container, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import AdminLayout from "../components/layout/AdminLayout";
import supabase from "../utils/supabase";
import { getReservationDashboardStats } from "../services/resortService";

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/admin");
        return;
      }

      setLoading(true);
      setError("");
      try {
        setStats(await getReservationDashboardStats());
      } catch (err) {
        setError(err.message || "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const queues = [
    { title: "Pending", count: stats?.pending || 0, href: "/pending", action: "Review new reservation requests" },
    { title: "Confirmed", count: stats?.confirmed || 0, href: "/confirmed", action: "Manage confirmed reservations" },
    { title: "Checked in", count: stats?.inHouse || 0, href: "/checkin", action: "View current in-house guests" },
  ];

  return (
    <AdminLayout onSignOut={handleLogout}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Dashboard
            </Typography>
            <Typography color="text.secondary">Active reservation queues.</Typography>
          </Box>

          {loading && <LinearProgress sx={{ borderRadius: 8 }} />}
          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
            {queues.map((queue) => (
              <Paper key={queue.title} elevation={1} sx={{ p: 2.5 }}>
                <Typography color="text.secondary">{queue.title}</Typography>
                <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5 }}>
                  {queue.count}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  {queue.action}
                </Typography>
                <Button component={Link} href={queue.href} variant="contained" sx={{ mt: 2 }}>
                  Open
                </Button>
              </Paper>
            ))}
          </Box>
        </Stack>
      </Container>
    </AdminLayout>
  );
}
