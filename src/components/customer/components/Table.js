import React from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Collapse from "@material-ui/core/Collapse";
import IconButton from "@material-ui/core/IconButton";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@material-ui/icons/KeyboardArrowUp";

const useRowStyles = makeStyles({
  root: {
    "& > *": {
      borderBottom: "unset",
    },
  },
});

function Row(props) {
  const { row } = props;
  const [open, setOpen] = React.useState(false);
  const classes = useRowStyles();

  return (
    <React.Fragment>
      <TableRow className={classes.root}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {row.name}
        </TableCell>
        <TableCell align="right">{row.email}</TableCell>
        <TableCell align="right">{row.contactNumber}</TableCell>
        <TableCell align="right">{row.status}</TableCell>
        <TableCell align="right">{row.balance}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box margin={1}>
              <Table size="small" aria-label="purchases">
                <TableHead>
                  <TableRow>
                    <TableCell>Room Type</TableCell>
                    <TableCell>Room Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.reservedRoom.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell component="th" scope="row">
                        {room.name}
                      </TableCell>
                      <TableCell>{room.reserved_quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

Row.propTypes = {
  row: PropTypes.shape({
    name: PropTypes.string.isRequired,
    reservedRoom: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        reserved_quantity: PropTypes.number.isRequired,
      })
    ).isRequired,
    contactNumber: PropTypes.string.isRequired,
    balance: PropTypes.number.isRequired,
    status: PropTypes.string.isRequired,
  }).isRequired,
};

export default function CollapsibleTable({ reservations }) {
  const rows = reservations.map((res) => {
    const { first_name, last_name, email, contact_number } = res.customer;

    return {
      id: res.id,
      name: `${first_name} ${last_name}`,
      email,
      contactNumber: contact_number,
      status: res.status,
      balance: 2000,
      reservedRoom: res.reserved_room.map(
        ({ id, room: { name }, reserved_quantity }) => ({
          id,
          name,
          reserved_quantity,
        })
      ),
    };
  });

  return (
    <TableContainer component={Paper}>
      <Table aria-label="collapsible table">
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Customer Name</TableCell>
            <TableCell align="right">Email</TableCell>
            <TableCell align="right">Contact Number</TableCell>
            <TableCell align="right">Status</TableCell>
            <TableCell align="right">Balance</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
