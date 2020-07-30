import React, { useState, useEffect } from "react";
import Grid from "@material-ui/core/Grid";
import { DatePicker } from "@material-ui/pickers";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardMedia from "@material-ui/core/CardMedia";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";
import { makeStyles } from "@material-ui/core/styles";
import Skeleton from "@material-ui/lab/Skeleton";
import TextField from "@material-ui/core/TextField";
import Paper from "@material-ui/core/Paper";
import moment from "moment";
import io from "socket.io-client";

const BASE_URL = process.env.REACT_APP_BASE_URL;
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

  root: {
    display: "flex",
    justifyContent: "space-between",
  },
  details: {
    display: "flex",
    flexDirection: "column",
  },
  content: {
    flex: "1 0 auto",
  },
  cover: {
    width: 300,
  },
}));

const SelectRoom = ({
  handleSelectRoom,
  handleChange,
  handleDateChange,
  handleChangeRoom,
  state,
}) => {
  const classes = useStyles();
  const [data, setData] = useState({ rooms: [], reservedRooms: [] });
  const [loading, setLoading] = useState(true);
  const { checkin, checkout, roomQuantity, room, adult, children } = state;
  const { rooms, reservedRooms } = data;

  const filteredReservedRooms = reservedRooms
    .filter(
      (res) =>
        moment(res.checkin).isBetween(checkin, checkout, null, "[]") ||
        moment(res.checkout).isBetween(checkin, checkout, null, "[]")
    )
    .flatMap((res) => res.reserved_room);

  const filteredRooms = rooms
    .map((room) => {
      let object = filteredReservedRooms.find((value) => value.id === room.id);
      return object
        ? { ...room, quantity: room.quantity - object.quantity }
        : room;
    })
    .filter((room) => room.occupancy >= adult || room.quantity <= roomQuantity);

  const maxRoomQuantity =
    filteredRooms.length > 0
      ? Array.from(
          Array(Math.max(...filteredRooms.map((r) => r.quantity))),
          (_, i) => i + 1
        )
      : [0];
  const maxAdultQuantity =
    filteredRooms.length > 0
      ? Array.from(
          Array(Math.max(...filteredRooms.map((r) => r.occupancy))),
          (_, i) => i + 1
        )
      : [0];

  const handleSelectRoomEmit = (room) => {
    const reservationDetails = {
      checkin,
      checkout,
      reserved_room: [{ id: room.id, quantity: state.roomQuantity }],
    };
    localStorage.setItem(
      "RESERVATION_DETAILS",
      JSON.stringify(reservationDetails)
    );
    handleSelectRoom(room);
  };

  useEffect(() => {
    setLoading(true);
    let reservationDetails = localStorage.getItem("RESERVATION_DETAILS");
    socket.emit("get-reserved-rooms", JSON.parse(reservationDetails));

    socket.on("get-reserved-rooms", (data) => {
      setData(data);
      setLoading(false);
    });
  }, []);

  return (
    <React.Fragment>
      {Object.keys(state.room).length === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <DatePicker
              inputVariant="outlined"
              fullWidth
              label="Checkin Date"
              value={checkin}
              onChange={(date) => handleDateChange("checkin", date)}
              animateYearScrolling
              format="YYYY-MM-DD"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <DatePicker
              inputVariant="outlined"
              fullWidth
              label="Checkout Date"
              value={checkout}
              onChange={(date) => handleDateChange("checkout", date)}
              animateYearScrolling
              format="YYYY-MM-DD"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Room quantity"
              value={roomQuantity}
              name="roomQuantity"
              onChange={handleChange}
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
              select
              label="Number of adults"
              value={adult}
              name="adult"
              onChange={handleChange}
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
              value={children}
              name="children"
              onChange={handleChange}
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
          <Grid item xs={12}>
            <Divider />
          </Grid>
        </Grid>
      )}

      {/* <Container className={classes.cardGrid} maxWidth="md"> */}
      {Object.keys(state.room).length !== 0 ? (
        <Grid container spacing={3}>
          <Grid item xs={4}>
            <Card className={classes.root}>
              <CardContent className={classes.content}>
                <Typography variant="h5" gutterBottom>
                  Reservation Details
                </Typography>
                <Typography variant="h6" gutterBottom>
                  Checkin: {state.checkin}
                </Typography>
                <Typography variant="h6" gutterBottom>
                  Checkout: {state.checkout}
                </Typography>
                <Typography variant="h6" gutterBottom>
                  Number of rooms: {state.roomQuantity}
                </Typography>
                <Typography variant="h6" gutterBottom>
                  Adult: {state.adult}
                </Typography>
                <Typography variant="h6" gutterBottom>
                  Children: {state.children}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={8}>
            <Card className={classes.root}>
              <div className={classes.details}>
                <CardContent className={classes.content}>
                  <Typography component="h5" variant="h5">
                    {state.room.name}
                  </Typography>
                  <Typography variant="subtitle1" color="textSecondary">
                    Occupancy: {state.room.occupancy}
                  </Typography>
                  <Typography variant="subtitle2" color="textSecondary">
                    {state.room.description}
                  </Typography>
                </CardContent>
              </div>
              <CardActions>
                <Button
                  size="small"
                  color="primary"
                  onClick={() => handleChangeRoom(state.room)}
                >
                  Change
                </Button>
              </CardActions>
              <CardMedia
                className={classes.cover}
                image={`${BASE_URL}${state.room.image.url}`}
                title={state.room.name}
              />
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography component="h5" variant="h5">
              Available Rooms
            </Typography>
          </Grid>
          {(loading ? Array.from(new Array(3)) : filteredRooms).map((room) =>
            room ? (
              <Grid item key={room.id} xs={12} sm={6} md={4}>
                <Card className={classes.card}>
                  <CardMedia
                    className={classes.cardMedia}
                    image={`${BASE_URL}${room.image.url}`}
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
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => handleSelectRoomEmit(room)}
                    >
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
      )}
      {/* </Container> */}
    </React.Fragment>
  );
};

export default SelectRoom;
