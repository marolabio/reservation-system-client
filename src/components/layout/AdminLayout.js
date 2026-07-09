import React from "react";
import { Box, Button, Divider, IconButton, LinearProgress, Stack, Tooltip, Typography, useMediaQuery } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import MenuIcon from "@mui/icons-material/Menu";
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
      { label: "Checked out", href: "/checkout", icon: BarChartIcon },
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
  const shouldStartCollapsed = useMediaQuery((theme) => theme.breakpoints.down("md"));
  const [sideNavOpen, setSideNavOpen] = React.useState(true);
  const navItems = navSections.flatMap((section) => section.items);

  React.useEffect(() => {
    setSideNavOpen(!shouldStartCollapsed);
  }, [shouldStartCollapsed]);

  return (
    <Box sx={{ bgcolor: "background.default", display: "flex", minHeight: "100vh" }}>
      <Box
        component="aside"
        sx={{
          alignSelf: "stretch",
          bgcolor: "background.paper",
          borderRight: "1px solid",
          borderColor: "divider",
          display: { xs: "none", sm: "flex" },
          flexDirection: "column",
          flexShrink: 0,
          minHeight: "100vh",
          position: "sticky",
          top: 0,
          transition: (theme) =>
            theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.shortest,
            }),
          width: sideNavOpen ? 248 : 72,
        }}
      >
        <Box
          sx={{
            alignItems: "center",
            display: "flex",
            gap: 1,
            justifyContent: sideNavOpen ? "space-between" : "center",
            px: sideNavOpen ? 2 : 1,
            py: 1.25,
            minHeight: 65,
          }}
        >
          <Typography
            component="a"
            href="/bookings"
            sx={{
              color: "text.primary",
              display: sideNavOpen ? "block" : "none",
              fontWeight: 800,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Hotel Reservations
          </Typography>
          <Typography
            component="a"
            href="/bookings"
            sx={{
              color: "text.primary",
              display: sideNavOpen ? "none" : "block",
              fontWeight: 800,
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            HR
          </Typography>
          <Tooltip title={sideNavOpen ? "Collapse navigation" : "Expand navigation"} placement="right">
            <IconButton
              aria-label={sideNavOpen ? "Collapse navigation" : "Expand navigation"}
              onClick={() => setSideNavOpen((current) => !current)}
              size="small"
              sx={{
                flexShrink: 0,
                ml: sideNavOpen ? 1 : 0,
              }}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider />

        <Stack component="nav" spacing={1.25} sx={{ flexGrow: 1, p: 1 }}>
          {navSections.map((section) => (
            <Box key={section.label}>
              <Typography
                sx={{
                  color: "text.secondary",
                  display: sideNavOpen ? "block" : "none",
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
                          justifyContent: sideNavOpen ? "flex-start" : "center",
                          minHeight: 44,
                          minWidth: 0,
                          px: sideNavOpen ? 1.5 : 1,
                          textTransform: "none",
                          bgcolor: active ? "primary.main" : "transparent",
                          "& .MuiButton-startIcon": {
                            m: sideNavOpen ? "0 8px 0 0" : 0,
                          },
                          "&:hover": {
                            bgcolor: active ? "primary.dark" : "action.hover",
                          },
                        }}
                        fullWidth
                      >
                        <Box
                          component="span"
                          sx={{
                            display: sideNavOpen ? "inline" : "none",
                            flexGrow: 1,
                            minWidth: 0,
                            overflow: "hidden",
                            textAlign: "left",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
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
                justifyContent: sideNavOpen ? "flex-start" : "center",
                minHeight: 44,
                minWidth: 0,
                px: sideNavOpen ? 1.5 : 1,
                textTransform: "none",
                "& .MuiButton-startIcon": {
                  m: sideNavOpen ? "0 8px 0 0" : 0,
                },
              }}
              fullWidth
            >
              <Box component="span" sx={{ display: sideNavOpen ? "inline" : "none" }}>
                Sign out
              </Box>
            </Button>
          </Tooltip>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          pb: { xs: 9, sm: 0 },
          position: "relative",
          width: "100%",
        }}
      >
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

      <Box
        component="nav"
        sx={{
          bgcolor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
          bottom: 0,
          boxShadow: 3,
          display: { xs: "flex", sm: "none" },
          gap: 0.5,
          left: 0,
          overflowX: "auto",
          px: 0.75,
          py: 0.75,
          position: "fixed",
          right: 0,
          zIndex: (theme) => theme.zIndex.appBar + 1,
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = router.pathname === item.href;

          return (
            <Button
              key={item.href}
              href={item.href}
              sx={{
                borderRadius: 1,
                color: active ? "primary.contrastText" : "text.primary",
                flex: "0 0 76px",
                minHeight: 58,
                minWidth: 0,
                px: 0.75,
                py: 0.5,
                textTransform: "none",
                bgcolor: active ? "primary.main" : "transparent",
                "&:hover": {
                  bgcolor: active ? "primary.dark" : "action.hover",
                },
              }}
            >
              <Stack spacing={0.25} alignItems="center" sx={{ minWidth: 0 }}>
                <Icon fontSize="small" />
                <Typography
                  component="span"
                  sx={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </Typography>
              </Stack>
            </Button>
          );
        })}
        <Button
          onClick={onSignOut}
          sx={{
            borderRadius: 1,
            color: "text.primary",
            flex: "0 0 76px",
            minHeight: 58,
            minWidth: 0,
            px: 0.75,
            py: 0.5,
            textTransform: "none",
          }}
        >
          <Stack spacing={0.25} alignItems="center" sx={{ minWidth: 0 }}>
            <LogoutIcon fontSize="small" />
            <Typography
              component="span"
              sx={{
                fontSize: 10.5,
                fontWeight: 700,
                lineHeight: 1.1,
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Sign out
            </Typography>
          </Stack>
        </Button>
      </Box>
    </Box>
  );
}
