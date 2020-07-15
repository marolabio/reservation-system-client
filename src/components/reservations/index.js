import React, { useEffect } from "react";
import { connect } from "react-redux";
import { getRooms } from "./../../actions/room";
import { Grid } from "@material-ui/core";
import Content from "./../layout/Content";
import io from "socket.io-client";

const socket = io(process.env.REACT_APP_BASE_URL)

function Reservations({ getRooms, rooms, loading }) {

  useEffect(() => {
    getRooms();
    socket.on("hello", (res) => {
      console.log(res)
    });

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
  rooms: state.room.rooms.filter((room) => room.available > 0),
  loading: state.room.loading,
});

export default connect(mapStateToProps, { getRooms })(Reservations);
