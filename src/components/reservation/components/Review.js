import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Grid from '@material-ui/core/Grid';

const rooms = [
  { name: 'Bamboo House', desc: 'This is a sample description', price: '2000.00' },
  { name: 'Standard Room', desc: 'This is a another description', price: '1500.00' },
];

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
}));

export default function Review() {
  const classes = useStyles();

  return (
    <React.Fragment>
      <Typography variant="h6" gutterBottom>
        Reservation summary
      </Typography>
      <List disablePadding>
        {rooms.map((room) => (
          <ListItem className={classes.listItem} key={room.name}>
            <ListItemText primary={room.name} secondary={room.desc} />
            <Typography variant="body2">{room.price}</Typography>
          </ListItem>
        ))}
        <ListItem className={classes.listItem}>
          <ListItemText primary="Total" />
          <Typography variant="subtitle1" className={classes.total}>
            3200.00
          </Typography>
        </ListItem>
      </List>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="h6" gutterBottom className={classes.title}>
            Personal details
          </Typography>
          <Typography gutterBottom>John Smith</Typography>
          <Typography gutterBottom>sample@gmail.com</Typography>
        </Grid>
      </Grid>
    </React.Fragment>
  );
}