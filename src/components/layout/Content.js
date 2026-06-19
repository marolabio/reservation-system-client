import React from "react";
import { Container, Box, LinearProgress } from "@mui/material";
import SideBar from "./SideBar";
import Helmet from "./Helmet";
import Copyright from "./Copyright";

function Content({ children, title, loading }) {
  return (
    <Box sx={{ display: "flex" }}>
      <Helmet title={title} />
      <SideBar title={title} />
      <Box component="main" sx={{ flexGrow: 1, height: "100vh", overflow: "auto" }}>
        <Box sx={(theme) => theme.mixins.toolbar} />
        {loading ? (
          <LinearProgress />
        ) : (
          <Container
            maxWidth="lg"
            sx={(theme) => ({
              paddingTop: theme.spacing(3),
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
