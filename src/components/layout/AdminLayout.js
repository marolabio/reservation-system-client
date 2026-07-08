import React from "react";
import { Box, Button, Divider, LinearProgress, Stack, Tooltip, Typography } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CategoryIcon from "@mui/icons-material/Category";
import HotelIcon from "@mui/icons-material/Hotel";
import LogoutIcon from "@mui/icons-material/Logout";
import AddBusinessIcon from "@mui/icons-material/AddBusiness";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import BarChartIcon from "@mui/icons-material/BarChart";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import RoomServiceIcon from "@mui/icons-material/RoomService";
import { useRouter } from "next/router";

const navSections = [
  {
    label: "Operations",
    items: [
      { label: "New booking", href: "/admin-booking", icon: AddBusinessIcon },
      { label: "Bookings", href: "/bookings", icon: AssignmentTurnedInIcon },
      { label: "Checked in", href: "/checkin", icon: CheckCircleIcon },
      { label: "Calendar", href: "/calendar", icon: CalendarMonthIcon },
      { label: "Walk-in Sales", href: "/walk-in-sales", icon: PointOfSaleIcon },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Sales Summary", href: "/sales-summary", icon: BarChartIcon },
      { label: "No show", href: "/noshow", icon: EventBusyIcon },
      { label: "Cancelled", href: "/cancelled", icon: CancelIcon },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Rooms", href: "/rooms", icon: HotelIcon },
      { label: "Amenities", href: "/amenities", icon: CategoryIcon },
      { label: "Services", href: "/service-catalog", icon: RoomServiceIcon },
    ],
  },
];

export default function AdminLayout({ children, loading = false, onSignOut }) {
  const router = useRouter();

  return (
    <Box sx={{ bgcolor: "background.default", display: "flex", minHeight: "100vh" }}>
      <Box
        component="aside"
        sx={{
          alignSelf: "stretch",
          bgcolor: "background.paper",
          borderRight: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          minHeight: "100vh",
          position: "sticky",
          top: 0,
          width: { xs: 72, md: 248 },
        }}
      >
        <Box sx={{ px: { xs: 1, md: 2 }, py: 2.25 }}>
          <Typography
            component="a"
            href="/bookings"
            sx={{
              color: "text.primary",
              display: { xs: "none", md: "block" },
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Hotel Reservations
          </Typography>
          <Typography
            component="a"
            href="/bookings"
            sx={{
              color: "text.primary",
              display: { xs: "block", md: "none" },
              fontWeight: 800,
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            HR
          </Typography>
        </Box>

        <Divider />

        <Stack component="nav" spacing={1.25} sx={{ flexGrow: 1, p: 1 }}>
          {navSections.map((section) => (
            <Box key={section.label}>
              <Typography
                sx={{
                  color: "text.secondary",
                  display: { xs: "none", md: "block" },
                  fontSize: 12,
                  fontWeight: 800,
                  px: 1.5,
                  py: 0.75,
                  textTransform: "uppercase",
                }}
              >
                {section.label}
              </Typography>
              <Stack spacing={0.75}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = router.pathname === item.href;

                  return (
                    <Tooltip
                      key={item.href}
                      title={item.label}
                      placement="right"
                      disableHoverListener={false}
                    >
                      <Button
                        href={item.href}
                        startIcon={<Icon />}
                        sx={{
                          borderRadius: 1,
                          color: active ? "primary.contrastText" : "text.primary",
                          justifyContent: { xs: "center", md: "flex-start" },
                          minHeight: 44,
                          minWidth: 0,
                          px: { xs: 1, md: 1.5 },
                          textTransform: "none",
                          bgcolor: active ? "primary.main" : "transparent",
                          "& .MuiButton-startIcon": {
                            m: { xs: 0, md: "0 8px 0 0" },
                          },
                          "&:hover": {
                            bgcolor: active ? "primary.dark" : "action.hover",
                          },
                        }}
                        fullWidth
                      >
                        <Box component="span" sx={{ display: { xs: "none", md: "inline" }, flexGrow: 1, textAlign: "left" }}>
                          {item.label}
                        </Box>
                      </Button>
                    </Tooltip>
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Stack>

        <Box sx={{ p: 1 }}>
          <Tooltip title="Sign out" placement="right">
            <Button
              onClick={onSignOut}
              startIcon={<LogoutIcon />}
              sx={{
                borderRadius: 1,
                color: "text.primary",
                justifyContent: { xs: "center", md: "flex-start" },
                minHeight: 44,
                minWidth: 0,
                px: { xs: 1, md: 1.5 },
                textTransform: "none",
                "& .MuiButton-startIcon": {
                  m: { xs: 0, md: "0 8px 0 0" },
                },
              }}
              fullWidth
            >
              <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
                Sign out
              </Box>
            </Button>
          </Tooltip>
        </Box>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, position: "relative" }}>
        <Box
          sx={{
            height: 4,
            left: 0,
            position: "sticky",
            right: 0,
            top: 0,
            zIndex: (theme) => theme.zIndex.appBar,
          }}
        >
          {loading && <LinearProgress />}
        </Box>
        {children}
      </Box>
    </Box>
  );
}
