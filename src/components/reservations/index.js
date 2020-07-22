import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Grid } from "@material-ui/core";
import Content from "./../layout/Content";
import io from "socket.io-client";
import { DatePicker } from "@material-ui/pickers";
import moment from "moment";

const socket = io(process.env.REACT_APP_BASE_URL);

function Reservations() {
  const [rooms, setRoom] = useState([]);
  const [loading, setLoading] = useState();
  const [checkinDate, handleCheckinDate] = useState(
    moment().format("YYYY-MM-DD")
  );
  const [checkoutDate, handleCheckoutDate] = useState(
    moment().format("YYYY-MM-DD")
  );

  useEffect(() => {
    setLoading(true);
    socket.emit("get-reserved-rooms");

    socket.on("get-reserved-rooms", ({ rooms, reservedRooms }) => {
      // Filter reservation based on date
      let filteredReservedRooms = reservedRooms
        .filter(
          (res) =>
            moment(res.checkin).isBetween(
              checkinDate,
              checkoutDate,
              null,
              "[]"
            ) ||
            moment(res.checkout).isBetween(
              checkinDate,
              checkoutDate,
              null,
              "[]"
            )
        )
        .flatMap((res) => res.reserved_room);

      // Update room quantity
      filteredReservedRooms.map((room) => {
        let objIndex = rooms.findIndex((value) => value.id === room.id);

        return (rooms[objIndex].quantity =
          rooms[objIndex].quantity - room.quantity);
      });

      setRoom(rooms.filter((room) => room.quantity > 0));
      setLoading(false);
    });
  }, [setRoom, checkinDate, checkoutDate]);

  return (
    <Content title="Reservations" loading={loading}>
      <Grid container spacing={3}>
        <Grid item xs={6}>
          <DatePicker
            label="Checkin Date"
            value={checkinDate}
            onChange={(date) => handleCheckinDate(date.format("YYYY-MM-DD"))}
            animateYearScrolling
            format="YYYY-MM-DD"
          />
        </Grid>
        <Grid item xs={6}>
          <DatePicker
            label="Checkout Date"
            value={checkoutDate}
            onChange={(date) => handleCheckoutDate(date.format("YYYY-MM-DD"))}
            animateYearScrolling
            format="YYYY-MM-DD"
          />
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

export default connect(null, {})(Reservations);
