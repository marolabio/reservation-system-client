import React, { useEffect, useState } from "react";
import Table from "./components/Table";
import Content from "../layout/Content";
import { connect } from "react-redux";
import { getReservations } from "../../actions/reservation";

function Customer({ reservations, getReservations }) {
  const [loading, setLoading] = useState(false);
  console.log("reservations", reservations);
  useEffect(() => {
    setLoading(true);
    getReservations().then(() => setLoading(false));
  }, [getReservations]);
  return (
    <Content title="Customers" loading={loading}>
      <Table reservations={reservations} />
    </Content>
  );
}

const mapStateToProps = (state) => ({
  reservations: state.reservation.reservations,
});

export default connect(mapStateToProps, { getReservations })(Customer);
