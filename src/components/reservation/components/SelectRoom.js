import React, { useState, useEffect } from "react";
import Grid from "@material-ui/core/Grid";
import { DatePicker } from "@material-ui/pickers";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardMedia from "@material-ui/core/CardMedia";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import Container from "@material-ui/core/Container";
import { makeStyles } from "@material-ui/core/styles";
import Skeleton from "@material-ui/lab/Skeleton";
import TextField from "@material-ui/core/TextField";

import moment from "moment";
import io from "socket.io-client";

const socket = io(process.env.REACT_APP_BASE_URL);

const useStyles = makeStyles((theme) => ({
  cardGrid: {
    paddingTop: theme.spacing(8),
    paddingBottom: theme.spacing(8),
  },
  card: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  cardMedia: {
    paddingTop: "56.25%", // 16:9
  },
  cardContent: {
    flexGrow: 1,
  },
}));

export default function SelectRoom({handleNext}) {
  const classes = useStyles();
  const [data, setData] = useState({ rooms: [], reservedRooms: [] });
  const { rooms, reservedRooms } = data;
  const [loading, setLoading] = useState();
  const [checkinDate, setCheckinDate] = useState(moment().format("YYYY-MM-DD"));
  const [checkoutDate, setCheckoutDate] = useState(
    moment().format("YYYY-MM-DD")
  );
  const [roomQuantity, setRoomQuantity] = useState(1);
  const [adultQuantity, setAdultQuantity] = useState(1);
  const [childrenQuantity, setChildrenQuantity] = useState(0);

  // Filter reservation based on date
  const filteredReservedRooms = reservedRooms
    .filter(
      (res) =>
        moment(res.checkin).isBetween(checkinDate, checkoutDate, null, "[]") ||
        moment(res.checkout).isBetween(checkinDate, checkoutDate, null, "[]")
    )
    .flatMap((res) => res.reserved_room);

  // Update room quantity and filter through
  const filteredRooms = rooms
    .map((room) => {
      let object = filteredReservedRooms.find((value) => value.id === room.id);
      return object
        ? { ...room, quantity: room.quantity - object.quantity }
        : room;
    })
    .filter(
      (room) => room.occupancy >= adultQuantity || room.quantity <= roomQuantity
    );

  const maxRoomQuantity = filteredRooms.length > 0 ?  Array.from(Array(Math.max(...filteredRooms.map(r => r.quantity))), (_, i) => i + 1) : [0];
  const maxAdultQuantity = filteredRooms.length > 0 ?  Array.from(Array(Math.max(...filteredRooms.map(r => r.occupancy))), (_, i) => i + 1) : [0];
 

  useEffect(() => {
    setLoading(true);
    socket.emit("get-reserved-rooms");

    socket.on("get-reserved-rooms", (data) => {
      setData(data);
      setLoading(false);
    });
  }, []);

  return (
    <React.Fragment>
      <Typography variant="h6" gutterBottom>
        Select Room
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <DatePicker
            inputVariant="outlined"
            fullWidth
            label="Checkin Date"
            value={checkinDate}
            onChange={(date) => setCheckinDate(date.format("YYYY-MM-DD"))}
            animateYearScrolling
            format="YYYY-MM-DD"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <DatePicker
            inputVariant="outlined"
            fullWidth
            label="Checkout Date"
            value={checkoutDate}
            onChange={(date) => setCheckoutDate(date.format("YYYY-MM-DD"))}
            animateYearScrolling
            format="YYYY-MM-DD"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            id="standard-select-currency-native"
            select
            label="Room quantity"
            value={roomQuantity}
            onChange={(e) => setRoomQuantity(e.target.value)}
            variant="outlined"
            SelectProps={{
              native: true,
            }}
            fullWidth
          >
            {maxRoomQuantity.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            id="standard-select-currency-native"
            select
            label="Number of adults"
            value={adultQuantity}
            onChange={(e) => setAdultQuantity(e.target.value)}
            variant="outlined"
            SelectProps={{
              native: true,
            }}
            fullWidth
          >
            {maxAdultQuantity.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            id="standard-select-currency-native"
            select
            label="Number of children"
            value={childrenQuantity}
            onChange={(e) => setChildrenQuantity(e.target.value)}
            variant="outlined"
            SelectProps={{
              native: true,
            }}
            fullWidth
          >
            {[0, 1, 2, 3, 4].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </TextField>
        </Grid>

        <Container className={classes.cardGrid} maxWidth="md">
          <Grid container spacing={4}>
            {(loading ? Array.from(new Array(3)) : filteredRooms).map((room) =>
              room ? (
                <Grid item key={room.id} xs={12} sm={6} md={4}>
                  <Card className={classes.card}>
                    <CardMedia
                      className={classes.cardMedia}
                      image="https://source.unsplash.com/random"
                      title={room.name}
                    />
                    <CardContent className={classes.cardContent}>
                      <Typography gutterBottom variant="h5" component="h2">
                        {room.name}
                      </Typography>
                      <Typography color="error">
                        Only {room.quantity} rooms left
                      </Typography>
                      <Typography>Occupancy: {room.occupancy}</Typography>
                      <Typography>{room.description}</Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small" color="primary" onClick={() => handleNext({room})}>
                        Reserve
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ) : (
                <Grid item xs={12} sm={6} md={4}>
                  <Skeleton variant="rect" width="100%" height="60%" />
                  <Skeleton width="100%" />
                  <Skeleton width="60%" />
                </Grid>
              )
            )}
          </Grid>
        </Container>
      </Grid>
    </React.Fragment>
  );
}
