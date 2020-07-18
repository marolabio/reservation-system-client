import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { getRooms } from "./../../actions/room";
import { Grid, Button } from "@material-ui/core";
import Content from "./../layout/Content";
import io from "socket.io-client";
import { DatePicker } from "@material-ui/pickers";
import moment from "moment";

const socket = io(process.env.REACT_APP_BASE_URL);

function Reservations({ getRooms, loading, rooms }) {
  const [checkinDate, handleCheckinDate] = useState(
    moment().format("YYYY-MM-DD")
  );
  const [checkoutDate, handleCheckoutDate] = useState(
    moment().format("YYYY-MM-DD")
  );


  useEffect(() => {
    getRooms();
    socket.on("get_reserved_rooms", (reserved_rooms) => {
      console.log("reserved_rooms", reserved_rooms);
      // reserved_rooms.map(({ reserved_quantity, room }) => {
      //   let objIndex = rooms.findIndex((value) => value.id === room.id);
      //   rooms[objIndex].quantity = rooms[objIndex].quantity - reserved_quantity;
      // });
    });
  }, [getRooms]);

  // rooms.filter((room) => room.quantity > 0)

  return (
    <Content title="Reservations" loading={loading}>
      <Grid container spacing={3}>
        <Grid item xs={4}>
          <DatePicker
            label="Checkin Date"
            value={checkinDate}
            onChange={(date) => handleCheckinDate(date.format("YYYY-MM-DD"))}
            animateYearScrolling
            format="YYYY-MM-DD"
          />
        </Grid>
        <Grid item xs={4}>
          <DatePicker
            label="Checkout Date"
            value={checkoutDate}
            onChange={(date) => handleCheckoutDate(date.format("YYYY-MM-DD"))}
            animateYearScrolling
            format="YYYY-MM-DD"
          />
        </Grid>

        <Grid item xs={4}>
          <Button variant="contained" color="primary">
            Search
          </Button>
        </Grid>

        <Grid item xs={12}>
          {rooms.map((room) => (
            <div key={room.id}>
              <br />
              Name: {room.name}
              <br />
              Available: {room.quantity}
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
  rooms: state.room.rooms,
});

export default connect(mapStateToProps, { getRooms })(Reservations);
