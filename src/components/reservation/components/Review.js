import React from "react";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Grid from "@mui/material/Grid";
import moment from "moment";

export default function Review({ state }) {
  const {
    checkin,
    checkout,
    roomQuantity,
    room,
    adult,
    form: { firstName, lastName, email, cityProvince },
  } = state;

  return (
    <React.Fragment>
      <List disablePadding>
        <ListItem sx={(theme) => ({ padding: theme.spacing(1, 0) })} key={room.name}>
          <ListItemText
            primary={`${room.name} X ${roomQuantity}`}
            secondary={
              <React.Fragment>
                <Typography
                  component="span"
                  variant="body2"
                  sx={{ display: "inline" }}
                  color="textPrimary"
                >
                  {`${moment(checkin).format("MMMM Do")} - ${moment(
                    checkout
                  ).format("MMMM Do YYYY")}`}
                </Typography>
                <br />
                <Typography
                  component="span"
                  variant="body3"
                  sx={{ display: "inline" }}
                  color="textPrimary"
                >
                  {`${adult} adult`}
                </Typography>
              </React.Fragment>
            }
          />
          <Typography variant="body2">{room.rate}</Typography>
        </ListItem>
        <ListItem sx={(theme) => ({ padding: theme.spacing(1, 0) })}>
          <ListItemText primary="Total" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {room.rate * roomQuantity}
          </Typography>
        </ListItem>
      </List>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography
            variant="h6"
            gutterBottom
            sx={(theme) => ({ marginTop: theme.spacing(2) })}
          >
            Personal details
          </Typography>
          <Typography gutterBottom>{`${firstName} ${lastName}`}</Typography>
          <Typography gutterBottom>{email}</Typography>
          {cityProvince && <Typography gutterBottom>{cityProvince}</Typography>}
        </Grid>
      </Grid>
    </React.Fragment>
  );
}
