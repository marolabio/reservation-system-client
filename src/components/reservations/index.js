import React, { useEffect } from "react";
import { connect } from "react-redux";
import { getRooms } from "./../../actions/room";
import { Grid } from "@material-ui/core";
import Content from "./../layout/Content";

function Reservations({ getRooms, rooms, loading }) {
  useEffect(() => {
    getRooms();
  }, [getRooms]);

  return (
    <Content title="Reservations" loading={loading}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8} lg={9}>
          {rooms.map((room) => (
            <div key={room.id}>{room.name}</div>
          ))}
        </Grid>
      </Grid>
    </Content>
  );
}

const mapStateToProps = (state) => ({
  rooms: state.room.rooms.filter(room => room.available > 0),
  loading: state.room.loading,
});

export default connect(mapStateToProps, { getRooms })(Reservations);
