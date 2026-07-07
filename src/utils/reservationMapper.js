export function mapReservation(row) {
  const customer = row.customers || row.customer || {};
  const reservedRooms = row.reserved_rooms || row.reserved_room || [];

  return {
    id: row.id,
    checkin: row.checkin,
    checkout: row.checkout,
    status: row.status,
    customer: {
      id: customer.id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      contact_number: customer.contact_number,
      city_province: customer.city_province,
    },
    reserved_room: reservedRooms.map((reservedRoom) => ({
      id: reservedRoom.id,
      quantity: reservedRoom.quantity || reservedRoom.reserved_quantity,
      reserved_quantity: reservedRoom.reserved_quantity || reservedRoom.quantity,
      room: reservedRoom.rooms || reservedRoom.room || {},
    })),
  };
}
