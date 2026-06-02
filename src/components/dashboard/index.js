import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Paper, Grid } from "@mui/material";
import Chart from "./components/Chart";
import Deposits from "./components/Deposits";
import Customers from "./components/Customers";
import Content from "./../layout/Content";
import { getReservations } from "../../actions/reservation";

const paperSx = (theme) => ({
  padding: theme.spacing(2),
  display: "flex",
  overflow: "auto",
  flexDirection: "column",
});

const fixedHeightPaperSx = (theme) => ({
  ...paperSx(theme),
  height: 240,
});

const Dashboard = ({ reservations, getReservations }) => {
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
          <Paper sx={fixedHeightPaperSx}>
            <Chart />
          </Paper>
        </Grid>
        {/* Recent Deposits */}
        <Grid item xs={12} md={4} lg={3}>
          <Paper sx={fixedHeightPaperSx}>
            <Deposits />
          </Paper>
        </Grid>
        {/* Recent Orders */}
        <Grid item xs={12}>
          <Paper sx={paperSx}>
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
