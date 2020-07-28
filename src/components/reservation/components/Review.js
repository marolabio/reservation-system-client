import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Grid from "@material-ui/core/Grid";
import moment from "moment";

const useStyles = makeStyles((theme) => ({
  listItem: {
    padding: theme.spacing(1, 0),
  },
  total: {
    fontWeight: 700,
  },
  title: {
    marginTop: theme.spacing(2),
  },
  inline: {
    display: "inline",
  },
}));

export default function Review({ state }) {
  const classes = useStyles();
  const {
    checkin,
    checkout,
    roomQuantity,
    room,
    adult,
    children,
    firstName,
    lastName,
    email,
  } = state;

  return (
    <React.Fragment>
      <List disablePadding>
        <ListItem className={classes.listItem} key={room.name}>
          <ListItemText
            primary={`${room.name} X ${roomQuantity}`}
            secondary={
              <React.Fragment>
                <Typography
                  component="span"
                  variant="body2"
                  className={classes.inline}
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
                  className={classes.inline}
                  color="textPrimary"
                >
                  {`${adult} adult`}
                </Typography>
              </React.Fragment>
            }
          />
          <Typography variant="body2">{room.rate}</Typography>
        </ListItem>
        <ListItem className={classes.listItem}>
          <ListItemText primary="Total" />
          <Typography variant="subtitle1" className={classes.total}>
            {room.rate * roomQuantity}
          </Typography>
        </ListItem>
      </List>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="h6" gutterBottom className={classes.title}>
            Personal details
          </Typography>
          <Typography gutterBottom>{`${firstName} ${lastName}`}</Typography>
          <Typography gutterBottom>{email}</Typography>
        </Grid>
      </Grid>
    </React.Fragment>
  );
}
