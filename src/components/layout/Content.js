import React from "react";
import { Container, Box, LinearProgress } from "@mui/material";
import SideBar from "./SideBar";
import Helmet from "./Helmet";
import Copyright from "./Copyright";

function Content({ children, title, loading }) {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Helmet title={title} />
      <SideBar title={title} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          minWidth: 0,
          overflow: "auto",
          width: "100%",
        }}
      >
        <Box sx={(theme) => theme.mixins.toolbar} />
        {loading ? (
          <LinearProgress />
        ) : (
          <Container
            maxWidth="lg"
            sx={(theme) => ({
              px: { xs: 2, sm: 3 },
              paddingTop: { xs: theme.spacing(2), sm: theme.spacing(3) },
              paddingBottom: theme.spacing(3),
            })}
          >
            {children}
            <Box pt={4}>
              <Copyright />
            </Box>
          </Container>
        )}
      </Box>
    </Box>
  );
}

export default Content;
