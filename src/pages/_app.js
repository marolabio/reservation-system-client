import React, { useEffect, useMemo, useState } from "react";
import NextApp from "next/app";
import { Provider } from "react-redux";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import Alert from "../components/layout/Alert";
import FloatingColorModeButton from "../components/layout/FloatingColorModeButton";
import store from "../store";
import { ColorModeContext } from "../utils/colorMode";
import "../App.css";

const colorModeStorageKey = "admin-color-mode";

function isColorMode(value) {
  return value === "dark" || value === "light";
}

function readColorModeCookie(cookie = "") {
  const match = cookie.match(/(?:^|;\s*)admin-color-mode=(dark|light)(?:;|$)/);
  return match ? match[1] : "light";
}

function writeColorModePreference(nextMode) {
  window.localStorage.setItem(colorModeStorageKey, nextMode);
  document.cookie = `${colorModeStorageKey}=${nextMode}; path=/; max-age=31536000; sameSite=lax`;
}

function buildTheme(mode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: "#0f766e",
      },
      secondary: {
        main: "#d97706",
      },
      background: {
        default: mode === "dark" ? "#0f172a" : "#f6f8f7",
        paper: mode === "dark" ? "#111827" : "#ffffff",
      },
    },
    shape: {
      borderRadius: 8,
    },
    typography: {
      fontSize: 13,
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h1: {
        fontSize: "2.75rem",
      },
      h2: {
        fontSize: "2.25rem",
      },
      h3: {
        fontSize: "1.9rem",
      },
      h4: {
        fontSize: "1.55rem",
      },
      h5: {
        fontSize: "1.2rem",
      },
      h6: {
        fontSize: "1rem",
      },
      body1: {
        fontSize: "0.875rem",
      },
      body2: {
        fontSize: "0.8rem",
      },
      button: {
        fontSize: "0.8125rem",
        textTransform: "none",
        fontWeight: 700,
      },
      caption: {
        fontSize: "0.72rem",
      },
    },
    components: {
      MuiTextField: {
        defaultProps: {
          size: "small",
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
          size: "small",
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            fontSize: "0.875rem",
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: "0.8125rem",
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            fontSize: "0.72rem",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontSize: "0.8125rem",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          label: {
            fontSize: "0.72rem",
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            fontSize: "0.8125rem",
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: "0.875rem",
          },
        },
      },
    },
  });
}

export default function App({ Component, pageProps, initialColorMode = "light" }) {
  const [mode, setMode] = useState(initialColorMode);

  useEffect(() => {
    const jssStyles = document.querySelector("#jss-server-side");
    if (jssStyles) {
      jssStyles.parentElement.removeChild(jssStyles);
    }

    const savedMode = window.localStorage.getItem(colorModeStorageKey);
    if (isColorMode(savedMode)) {
      writeColorModePreference(savedMode);
      setMode((currentMode) => (savedMode === currentMode ? currentMode : savedMode));
    }
  }, []);

  const colorMode = useMemo(() => ({
    mode,
    toggleColorMode: () => {
      setMode((currentMode) => {
        const nextMode = currentMode === "light" ? "dark" : "light";
        writeColorModePreference(nextMode);
        return nextMode;
      });
    },
  }), [mode]);

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <Provider store={store}>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Alert />
          <Component {...pageProps} />
          <FloatingColorModeButton />
        </ThemeProvider>
      </ColorModeContext.Provider>
    </Provider>
  );
}

App.getInitialProps = async (appContext) => {
  const appProps = await NextApp.getInitialProps(appContext);
  const cookie = appContext.ctx.req?.headers?.cookie || "";

  return {
    ...appProps,
    initialColorMode: readColorModeCookie(cookie),
  };
};
