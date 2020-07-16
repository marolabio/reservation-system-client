import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { getRooms } from "./../../actions/room";
import { Grid } from "@material-ui/core";
import Content from "./../layout/Content";
import io from "socket.io-client";

const socket = io(process.env.REACT_APP_BASE_URL);

function Reservations({ getRooms, loading }) {
  const [rooms, setRooms] = useState([]);
  useEffect(() => {
    getRooms();
    socket.on("get_available_rooms", (res) => {
      setRooms(res);
    });
  }, [getRooms]);

  return (
    <Content title="Reservations" loading={loading}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8} lg={9}>
          {rooms.map((room) => (
            <div key={room.id}>
              <br />
              Name: {room.name}
              <br />
              Available: {room.available}
              <br />
              <br />
            </div>
          ))}
        </Grid>
      </Grid>
    </Content>
  );
}

const mapStateToProps = (state) => ({
  loading: state.room.loading,
});

export default connect(mapStateToProps, { getRooms })(Reservations);
