import supabase from "../utils/supabase";

export function getRoomImage(image) {
  if (!image) return "https://images.unsplash.com/photo-1566073771259-6a8506099945";
  if (typeof image === "string") return image;
  return image.url || image.publicUrl || "https://images.unsplash.com/photo-1566073771259-6a8506099945";
}

function normalizeRoom(room) {
  const amenities = (room.room_amenities || [])
    .map((roomAmenity) => roomAmenity.amenities)
    .filter(Boolean)
    .sort((first, second) => String(first.name).localeCompare(String(second.name)));

  return {
    ...room,
    amenities,
  };
}

async function getRoomById(id) {
  const { data, error } = await supabase
    .from("rooms")
    .select("*, room_amenities(amenities(id,name))")
    .eq("id", id)
    .single();

  if (error) throw error;
  return normalizeRoom(data);
}

async function syncRoomAmenities(roomId, amenityIds = []) {
  const { error: deleteError } = await supabase
    .from("room_amenities")
    .delete()
    .eq("room_id", roomId);

  if (deleteError) throw deleteError;

  const rows = [...new Set(amenityIds)].filter(Boolean).map((amenityId) => ({
    room_id: roomId,
    amenity_id: amenityId,
  }));

  if (!rows.length) return;

  const { error: insertError } = await supabase
    .from("room_amenities")
    .insert(rows);

  if (insertError) throw insertError;
}

export async function getRoomAvailability({ checkin, checkout, excludeReservationId }) {
  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("*, room_amenities(amenities(id,name))")
    .eq("status", "active")
    .order("rate", { ascending: true });

  if (roomsError) throw roomsError;

  let reservationsQuery = supabase
    .from("reservations")
    .select("id, checkin, checkout, status, reserved_rooms(room_id, reserved_quantity)")
    .in("status", ["pending", "confirmed", "checked_in"])
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
      ...normalizeRoom(room),
      reserved_quantity: reservedQuantity,
      available_quantity: Number(room.quantity) - reservedQuantity,
    };
  });
}

export async function getAmenities() {
  const { data, error } = await supabase
    .from("amenities")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createAmenity(name) {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Amenity name is required.");

  const { data, error } = await supabase
    .from("amenities")
    .insert({ name: cleanName })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAmenity(id, name) {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Amenity name is required.");

  const { data, error } = await supabase
    .from("amenities")
    .update({ name: cleanName })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAmenity(id) {
  const { error } = await supabase
    .from("amenities")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getAdminRooms() {
  const { data, error } = await supabase
    .from("rooms")
    .select("*, room_amenities(amenities(id,name))")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeRoom);
}

async function getRoomSearchFilter(search) {
  const term = search?.trim();
  if (!term) return "";

  const escapedSearch = escapeLikeSearch(term).replace(/[(),]/g, " ");
  const filters = [
    `name.ilike.%${escapedSearch}%`,
    `description.ilike.%${escapedSearch}%`,
    `status.ilike.%${escapedSearch}%`,
  ];

  if (!Number.isNaN(Number(term))) {
    filters.push(`occupancy.eq.${Number(term)}`);
    filters.push(`quantity.eq.${Number(term)}`);
    filters.push(`rate.eq.${Number(term)}`);
  }

  const { data: amenities, error: amenitiesError } = await supabase
    .from("amenities")
    .select("id")
    .ilike("name", `%${escapedSearch}%`);

  if (amenitiesError) throw amenitiesError;

  const amenityIds = (amenities || []).map((amenity) => amenity.id);

  if (amenityIds.length) {
    const { data: roomAmenities, error: roomAmenitiesError } = await supabase
      .from("room_amenities")
      .select("room_id")
      .in("amenity_id", amenityIds);

    if (roomAmenitiesError) throw roomAmenitiesError;

    const roomIds = [...new Set((roomAmenities || []).map((roomAmenity) => roomAmenity.room_id))];
    if (roomIds.length) {
      filters.push(`id.in.(${roomIds.join(",")})`);
    }
  }

  return filters.join(",");
}

export async function getAdminRoomsPage({ page = 0, pageSize = 10, search = "" } = {}) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const searchFilter = await getRoomSearchFilter(search);

  let query = supabase
    .from("rooms")
    .select("*, room_amenities(amenities(id,name))", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchFilter) {
    query = query.or(searchFilter);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { rooms: (data || []).map(normalizeRoom), count: count || 0 };
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
      status: values.status || "active",
      image: imageUrl ? { url: imageUrl } : null,
    })
    .select()
    .single();

  if (error) throw error;
  await syncRoomAmenities(data.id, values.amenityIds);
  return getRoomById(data.id);
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
      status: values.status || "active",
      image: imageUrl ? { url: imageUrl } : null,
    })
    .eq("id", id)
    .select("*");

  if (error) throw error;
  const room = data?.[0];
  if (!room) throw new Error("Room was not found or could not be updated.");
  await syncRoomAmenities(id, values.amenityIds);
  return getRoomById(id);
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
        checked_in_at,
        checked_out_at,
        created_at,
        customers(first_name,last_name,email,contact_number),
        reserved_rooms(id,room_id,reserved_quantity,rooms(id,name,rate,status))
      `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

function escapeLikeSearch(value) {
  return value.replace(/[%_]/g, "\\$&");
}

async function getReservationSearchFilter(search) {
  const term = search?.trim();
  if (!term) return "";

  const escapedSearch = escapeLikeSearch(term).replace(/[(),]/g, " ");
  const customerQuery = supabase
    .from("customers")
    .select("id")
    .or(
      [
        `first_name.ilike.%${escapedSearch}%`,
        `last_name.ilike.%${escapedSearch}%`,
        `email.ilike.%${escapedSearch}%`,
        `contact_number.ilike.%${escapedSearch}%`,
      ].join(",")
    );
  const roomQuery = supabase
    .from("rooms")
    .select("id")
    .or([`name.ilike.%${escapedSearch}%`, `description.ilike.%${escapedSearch}%`].join(","));

  const [{ data: customers, error: customersError }, { data: rooms, error: roomsError }] = await Promise.all([
    customerQuery,
    roomQuery,
  ]);

  if (customersError) throw customersError;
  if (roomsError) throw roomsError;

  const customerIds = (customers || []).map((customer) => customer.id);
  const roomIds = (rooms || []).map((room) => room.id);
  let reservationIds = [];

  if (roomIds.length) {
    const { data: reservedRooms, error: reservedRoomsError } = await supabase
      .from("reserved_rooms")
      .select("reservation_id")
      .in("room_id", roomIds);

    if (reservedRoomsError) throw reservedRoomsError;
    reservationIds = [...new Set((reservedRooms || []).map((room) => room.reservation_id))];
  }

  const filters = [`status.ilike.%${escapedSearch}%`, `notes.ilike.%${escapedSearch}%`];

  if (customerIds.length) {
    filters.push(`customer_id.in.(${customerIds.join(",")})`);
  }

  if (reservationIds.length) {
    filters.push(`id.in.(${reservationIds.join(",")})`);
  }

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term)) {
    filters.push(`id.eq.${term}`);
  }

  return filters.join(",");
}

function applyReservationDashboardFilters(query, filters = {}) {
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.dateFilter && filters.dateFilter !== "all") {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (filters.dateFilter === "day") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    if (filters.dateFilter === "week") {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    }

    if (filters.dateFilter === "month") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    }

    if (filters.dateFilter === "year") {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
    }

    query = query
      .lte("checkin", end.toISOString().slice(0, 10))
      .gte("checkout", start.toISOString().slice(0, 10));
  }

  if (filters.searchFilter) {
    query = query.or(filters.searchFilter);
  }

  return query;
}

export async function getAdminReservationsPage({
  page = 0,
  pageSize = 10,
  status = "all",
  dateFilter = "all",
  search = "",
} = {}) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const searchFilter = await getReservationSearchFilter(search);

  let query = supabase
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
        checked_in_at,
        checked_out_at,
        created_at,
        customers(first_name,last_name,email,contact_number),
        reserved_rooms(id,room_id,reserved_quantity,rooms(id,name,rate,status))
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  query = applyReservationDashboardFilters(query, { status, dateFilter, searchFilter });

  const { data, error, count } = await query;

  if (error) throw error;
  return { reservations: data || [], count: count || 0 };
}

export async function getReservationDashboardStats({ dateFilter = "all", search = "" } = {}) {
  const searchFilter = await getReservationSearchFilter(search);

  const countForStatus = async (status) => {
    let query = supabase
      .from("reservations")
      .select("id", { count: "exact", head: true });

    query = applyReservationDashboardFilters(query, { status, dateFilter, searchFilter });

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  };

  const [total, pending, confirmed, inHouse, checkedOut, cancelled] = await Promise.all([
    countForStatus("all"),
    countForStatus("pending"),
    countForStatus("confirmed"),
    countForStatus("checked_in"),
    countForStatus("checked_out"),
    countForStatus("cancelled"),
  ]);

  return { total, pending, confirmed, inHouse, checkedOut, cancelled };
}

export async function updateReservationStatus(id, status) {
  const updates = { status };
  const now = new Date().toISOString();

  if (status === "checked_in") {
    updates.checked_in_at = now;
  }

  if (status === "checked_out") {
    updates.checked_out_at = now;
  }

  const { data, error } = await supabase
    .from("reservations")
    .update(updates)
    .eq("id", id)
    .select("id,status,checked_in_at,checked_out_at")
    .single();

  if (error) throw error;
  return data;
}

export async function checkInReservation(id) {
  await updateReservationStatus(id, "checked_in");
}

export async function checkOutReservation(reservation) {
  if (!reservation?.id) {
    throw new Error("Reservation was not found.");
  }

  await updateReservationStatus(reservation.id, "checked_out");
}

export async function updateReservationRooms(reservation, selectedRooms) {
  if (!reservation?.id) {
    throw new Error("Reservation was not found.");
  }

  const requestedRooms = (selectedRooms || [])
    .map((room) => ({
      roomId: room.roomId,
      roomQuantity: Number(room.roomQuantity),
    }))
    .filter((room) => room.roomId && room.roomQuantity > 0);

  if (!requestedRooms.length) {
    throw new Error("Choose at least one room.");
  }

  const availability = await getRoomAvailability({
    checkin: reservation.checkin,
    checkout: reservation.checkout,
    excludeReservationId: reservation.id,
  });

  requestedRooms.forEach((requestedRoom) => {
    const selectedRoom = availability.find((room) => room.id === requestedRoom.roomId);

    if (!selectedRoom) {
      throw new Error("Selected room was not found.");
    }

    if (Number(selectedRoom.available_quantity) < requestedRoom.roomQuantity) {
      throw new Error(`${selectedRoom.name} is no longer available for the selected dates.`);
    }
  });

  const totalCapacity = requestedRooms.reduce((sum, requestedRoom) => {
    const selectedRoom = availability.find((room) => room.id === requestedRoom.roomId);
    return sum + Number(selectedRoom?.occupancy || 0) * requestedRoom.roomQuantity;
  }, 0);

  if (totalCapacity < Number(reservation.adult)) {
    throw new Error("Selected rooms cannot fit the number of adults.");
  }

  const { error: deleteError } = await supabase
    .from("reserved_rooms")
    .delete()
    .eq("reservation_id", reservation.id);

  if (deleteError) throw deleteError;

  const reservedRooms = requestedRooms.map((room) => ({
    reservation_id: reservation.id,
    room_id: room.roomId,
    reserved_quantity: room.roomQuantity,
  }));

  const { error: insertError } = await supabase
    .from("reserved_rooms")
    .insert(reservedRooms);

  if (insertError) throw insertError;
}

export async function deleteReservation(id) {
  const { error } = await supabase
    .from("reservations")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
