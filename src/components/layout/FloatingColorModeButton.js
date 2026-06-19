import React, { useContext } from "react";
import { Fab, Tooltip } from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { ColorModeContext } from "../../utils/colorMode";

export default function FloatingColorModeButton() {
  const { mode, toggleColorMode } = useContext(ColorModeContext);
  const ColorModeIcon = mode === "dark" ? LightModeIcon : DarkModeIcon;
  const label = mode === "dark" ? "Use light mode" : "Use dark mode";

  return (
    <Tooltip title={label} placement="left">
      <Fab
        aria-label={label}
        color="primary"
        onClick={toggleColorMode}
        size="medium"
        sx={{
          bottom: { xs: 16, sm: 24 },
          boxShadow: 4,
          position: "fixed",
          right: { xs: 16, sm: 24 },
          zIndex: (theme) => theme.zIndex.tooltip,
        }}
      >
        <ColorModeIcon />
      </Fab>
    </Tooltip>
  );
}
