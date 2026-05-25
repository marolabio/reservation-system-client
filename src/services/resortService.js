import supabase from "../utils/supabase";

export function getRoomImage(image) {
  if (!image) return "https://images.unsplash.com/photo-1566073771259-6a8506099945";
  if (typeof image === "string") return image;
  return image.url || image.publicUrl || "https://images.unsplash.com/photo-1566073771259-6a8506099945";
}

export async function getRoomAvailability({ checkin, checkout, excludeReservationId }) {
  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("*")
    .order("rate", { ascending: true });

  if (roomsError) throw roomsError;

  let reservationsQuery = supabase
    .from("reservations")
    .select("id, checkin, checkout, status, reserved_rooms(room_id, reserved_quantity)")
    .in("status", ["pending", "confirmed"])
    .lt("checkin", checkout)
    .gt("checkout", checkin);

  if (excludeReservationId) {
    reservationsQuery = reservationsQuery.neq("id", excludeReservationId);
  }

  const { data: reservations, error: reservationsError } = await reservationsQuery;

  if (reservationsError) throw reservationsError;

  return (rooms || []).map((room) => {
    const reservedQuantity = (reservations || []).reduce((total, reservation) => {
      const reservedRooms = reservation.reserved_rooms || [];
      const roomTotal = reservedRooms
        .filter((reservedRoom) => reservedRoom.room_id === room.id)
        .reduce((sum, reservedRoom) => sum + Number(reservedRoom.reserved_quantity || 0), 0);

      return total + roomTotal;
    }, 0);

    return {
      ...room,
      reserved_quantity: reservedQuantity,
      available_quantity: Number(room.quantity) - reservedQuantity,
    };
  });
}

export async function getAdminRooms() {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createRoom(values) {
  const imageUrl = values.imageUrl?.trim();
  const { data, error } = await supabase
    .from("rooms")
    .insert({
      name: values.name.trim(),
      description: values.description?.trim() || null,
      occupancy: Number(values.occupancy),
      quantity: Number(values.quantity),
      rate: Number(values.rate),
      image: imageUrl ? { url: imageUrl } : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateRoom(id, values) {
  const imageUrl = values.imageUrl?.trim();
  const { data, error } = await supabase
    .from("rooms")
    .update({
      name: values.name.trim(),
      description: values.description?.trim() || null,
      occupancy: Number(values.occupancy),
      quantity: Number(values.quantity),
      rate: Number(values.rate),
      image: imageUrl ? { url: imageUrl } : null,
    })
    .eq("id", id)
    .select("*");

  if (error) throw error;
  const room = data?.[0];
  if (!room) throw new Error("Room was not found or could not be updated.");
  return room;
}

export async function deleteRoom(id) {
  const { error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function createReservation(values) {
  const rooms = await getRoomAvailability({
    checkin: values.checkin,
    checkout: values.checkout,
  });
  const requestedRooms = values.rooms?.length
    ? values.rooms
    : [{ roomId: values.roomId, roomQuantity: values.roomQuantity }];

  if (!requestedRooms.length) {
    throw new Error("Choose at least one room.");
  }

  requestedRooms.forEach((requestedRoom) => {
    const selectedRoom = rooms.find((room) => room.id === requestedRoom.roomId);

    if (!selectedRoom) {
      throw new Error("Selected room was not found.");
    }

    if (Number(selectedRoom.available_quantity) < Number(requestedRoom.roomQuantity)) {
      throw new Error(`${selectedRoom.name} is no longer available for the selected dates.`);
    }
  });

  const totalCapacity = requestedRooms.reduce((sum, requestedRoom) => {
    const selectedRoom = rooms.find((room) => room.id === requestedRoom.roomId);
    return sum + Number(selectedRoom?.occupancy || 0) * Number(requestedRoom.roomQuantity || 0);
  }, 0);

  if (totalCapacity < Number(values.adult)) {
    throw new Error("Selected rooms cannot fit the number of adults.");
  }

  const customerId = crypto.randomUUID();
  const reservationId = crypto.randomUUID();

  const { error: customerError } = await supabase
    .from("customers")
    .insert({
      id: customerId,
      first_name: values.firstName.trim(),
      last_name: values.lastName.trim(),
      contact_number: values.contactNumber.trim(),
      email: values.email.trim().toLowerCase(),
    });

  if (customerError) throw customerError;

  const { error: reservationError } = await supabase
    .from("reservations")
    .insert({
      id: reservationId,
      customer_id: customerId,
      checkin: values.checkin,
      checkout: values.checkout,
      adult: values.adult,
      children: values.children,
      status: values.status || "pending",
      notes: values.notes || null,
    });

  if (reservationError) throw reservationError;

  const reservedRooms = requestedRooms.map((room) => ({
    reservation_id: reservationId,
    room_id: room.roomId,
    reserved_quantity: room.roomQuantity,
  }));

  const { error: reservedRoomError } = await supabase
    .from("reserved_rooms")
    .insert(reservedRooms);

  if (reservedRoomError) throw reservedRoomError;

  return reservationId;
}

export async function getAdminReservations() {
  const { data, error } = await supabase
    .from("reservations")
    .select(
      `
        id,
        checkin,
        checkout,
        adult,
        children,
        status,
        notes,
        created_at,
        customers(first_name,last_name,email,contact_number),
        reserved_rooms(id,reserved_quantity,rooms(id,name,rate))
      `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateReservationStatus(id, status) {
  const { error } = await supabase
    .from("reservations")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteReservation(id) {
  const { error } = await supabase
    .from("reservations")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
