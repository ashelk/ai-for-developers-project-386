package com.calendar.repository;

import com.calendar.domain.Booking;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class BookingRepository {

  private final Map<UUID, Booking> store = new ConcurrentHashMap<>();

  public List<Booking> findAll() {
    return List.copyOf(store.values());
  }

  public Optional<Booking> findById(UUID id) {
    return Optional.ofNullable(store.get(id));
  }

  public Booking save(Booking booking) {
    store.put(booking.id(), booking);
    return booking;
  }

  public boolean deleteByEventTypeId(UUID eventTypeId) {
    return store.values().removeIf(b -> b.eventTypeId().equals(eventTypeId));
  }
}
