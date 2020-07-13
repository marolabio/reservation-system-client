import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Container, Box, LinearProgress } from "@material-ui/core";
import SideBar from "./SideBar";
import Helmet from "./Helmet";
import Copyright from "./Copyright";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },
  appBarSpacer: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    height: "100vh",
    overflow: "auto",
  },
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  paper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
  },
  fixedHeight: {
    height: 240,
  },
}));

function Content({ children, title, loading }) {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <Helmet title={title} />
      <SideBar title={title} />
      <main className={classes.content}>
        <div className={classes.appBarSpacer} />
        {loading ? (
          <LinearProgress />
        ) : (
          <Container maxWidth="lg" className={classes.container}>
            {children}
            <Box pt={4}>
              <Copyright />
            </Box>
          </Container>
        )}
      </main>
    </div>
  );
}

export default Content;
