import React from "react";
import { AppBar, Box, Button, Container, Toolbar, Typography } from "@mui/material";
import { useRouter } from "next/router";

const guestLinks = [
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
        <Toolbar
          disableGutters
          sx={{
            alignItems: { xs: "stretch", sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 1, sm: 2 },
            minHeight: 64,
            py: { xs: 1.25, sm: 0 },
          }}
        >
          <Typography
            component="a"
            href="/admin"
            sx={{
              color: "text.primary",
              fontWeight: 800,
              textDecoration: "none",
              textAlign: { xs: "center", sm: "left" },
              whiteSpace: "nowrap",
            }}
          >
            Hotel Reservations
          </Typography>

          <Box sx={{ display: { xs: "none", sm: "block" }, flexGrow: 1 }} />

          <Box
            sx={{
              alignItems: "center",
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              justifyContent: { xs: "center", sm: "flex-end" },
            }}
          >
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
