import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Grid } from "@material-ui/core";
import Content from "./../layout/Content";
import io from "socket.io-client";
import { DatePicker } from "@material-ui/pickers";
import moment from "moment";

const socket = io(process.env.REACT_APP_BASE_URL);

function Reservations() {
  const [state, setState] = useState({ rooms: [], reservedRooms: [] });
  const { rooms, reservedRooms } = state;
  const [loading, setLoading] = useState();
  const [checkinDate, setCheckinDate] = useState(moment().format("YYYY-MM-DD"));
  const [checkoutDate, setCheckoutDate] = useState(
    moment().format("YYYY-MM-DD")
  );

  // Filter reservation based on date
  const filteredReservedRooms = reservedRooms
    .filter(
      (res) =>
        moment(res.checkin).isBetween(checkinDate, checkoutDate, null, "[]") ||
        moment(res.checkout).isBetween(checkinDate, checkoutDate, null, "[]")
    )
    .flatMap((res) => res.reserved_room);

  // Update room quantity
  const filteredRooms = rooms.map(room => {
    let object = filteredReservedRooms.find((value) => value.id === room.id);
    return object ? {...room, quantity: room.quantity - object.quantity} : room
  })

  useEffect(() => {
    setLoading(true);
    socket.emit("get-reserved-rooms");

    socket.on("get-reserved-rooms", (data) => {
      setState(data);
      setLoading(false);
    });
  }, []);

  return (
    <Content title="Reservations" loading={loading}>
      <Grid container spacing={3}>
        <Grid item xs={6}>
          <DatePicker
            label="Checkin Date"
            value={checkinDate}
            onChange={(date) => setCheckinDate(date.format("YYYY-MM-DD"))}
            animateYearScrolling
            format="YYYY-MM-DD"
          />
        </Grid>
        <Grid item xs={6}>
          <DatePicker
            label="Checkout Date"
            value={checkoutDate}
            onChange={(date) => setCheckoutDate(date.format("YYYY-MM-DD"))}
            animateYearScrolling
            format="YYYY-MM-DD"
          />
        </Grid>
        <Grid item xs={12}>
          {filteredRooms.map((room) => (
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
