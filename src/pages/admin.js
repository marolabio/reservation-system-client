import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Avatar, Box, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import TopNav from "../components/layout/TopNav";
import supabase from "../utils/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/bookings");
    }
    checkSession();
  }, [router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setError("Invalid admin email or password.");
      return;
    }

    router.push("/bookings");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <TopNav />
      <Container maxWidth="xs" sx={{ py: 6 }}>
        <Paper elevation={2} sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={2.5} alignItems="stretch">
            <Avatar sx={{ mx: "auto", bgcolor: "primary.main", width: 52, height: 52 }}>
              <LockOutlinedIcon />
            </Avatar>
            <Box sx={{ textAlign: "center" }}>
              <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
                Admin sign in
              </Typography>
            </Box>
            {error && (
              <Typography color="error" sx={{ textAlign: "center" }}>
                {error}
              </Typography>
            )}
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  fullWidth
                  required
                  autoFocus
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  fullWidth
                  required
                />
                <Button type="submit" color="primary" variant="contained" size="large" fullWidth disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </Stack>
            </Box>
            <Button component={Link} href="/" color="primary">
              Back to booking
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
