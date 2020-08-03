import React, { useEffect } from "react";
import Table from "./components/Table";
import Content from "../layout/Content";
import { connect } from "react-redux";
import { getReservations } from "../../actions/reservation";

function Customer({ reservations, getReservations }) {
  console.log("reservations", reservations);
  useEffect(() => {
    getReservations();
  }, [getReservations]);
  return (
    <Content title="Customers" loading={false}>
      <Table reservations={reservations} />
    </Content>
  );
}

const mapStateToProps = (state) => ({
  reservations: state.reservation.reservations,
});

export default connect(mapStateToProps, { getReservations })(Customer);
