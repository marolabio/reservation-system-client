import React from "react";
import { AppBar, Box, Button, Container, Toolbar, Typography } from "@mui/material";
import { useRouter } from "next/router";

const guestLinks = [
  { label: "Book", href: "/" },
  { label: "Admin", href: "/admin" },
];

const adminLinks = [
  { label: "Bookings", href: "/bookings" },
  { label: "Checked in", href: "/checkin" },
  { label: "New booking", href: "/admin-booking" },
  { label: "Calendar", href: "/calendar" },
];

export default function TopNav({ admin = false, onSignOut }) {
  const router = useRouter();
  const links = admin ? adminLinks : guestLinks;

  return (
    <AppBar position="sticky" color="inherit" elevation={1}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: 64, gap: 2 }}>
          <Typography
            component="a"
            href="/"
            sx={{
              color: "text.primary",
              fontWeight: 800,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Hotel Reservations
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {links.map((link) => (
              <Button
                key={link.href}
                href={link.href}
                variant={router.pathname === link.href ? "contained" : "text"}
                size="small"
              >
                {link.label}
              </Button>
            ))}
            {admin && (
              <Button variant="outlined" size="small" onClick={onSignOut}>
                Sign out
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
