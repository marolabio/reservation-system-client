import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { makeStyles } from "@material-ui/core/styles";
import clsx from "clsx";
import { Paper, Grid } from "@material-ui/core";
import Chart from "./components/Chart";
import Deposits from "./components/Deposits";
import Customers from "./components/Customers";
import Content from "./../layout/Content";
import { getReservations } from "../../actions/reservation";

const useStyles = makeStyles((theme) => ({
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

const Dashboard = ({ reservations, getReservations }) => {
  const classes = useStyles();
  const fixedHeightPaper = clsx(classes.paper, classes.fixedHeight);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getReservations({ limit: 5 }).then(() => setLoading(false));
  }, [getReservations]);

  return (
    <Content title="Dashboard" loading={loading}>
      <Grid container spacing={3}>
        {/* Chart */}
        <Grid item xs={12} md={8} lg={9}>
          <Paper className={fixedHeightPaper}>
            <Chart />
          </Paper>
        </Grid>
        {/* Recent Deposits */}
        <Grid item xs={12} md={4} lg={3}>
          <Paper className={fixedHeightPaper}>
            <Deposits />
          </Paper>
        </Grid>
        {/* Recent Orders */}
        <Grid item xs={12}>
          <Paper className={classes.paper}>
            <Customers reservations={reservations} />
          </Paper>
        </Grid>
      </Grid>
    </Content>
  );
};

const mapStateToProps = (state) => ({
  reservations: state.reservation.reservations,
});

export default connect(mapStateToProps, { getReservations })(Dashboard);
