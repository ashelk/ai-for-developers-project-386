package com.calendar.dto;

import com.calendar.domain.Booking;
import com.calendar.domain.EventType;

import java.time.Instant;
import java.util.UUID;

/**
 * Booking with denormalized event-type info — used in the owner's list view
 * so the UI does not need to fetch event types separately.
 */
public record BookingWithEventType(
    UUID id,
    UUID eventTypeId,
    Instant startTime,
    Instant endTime,
    String guestName,
    String guestEmail,
    String guestNotes,
    Instant createdAt,
    EventType eventType
) {

  public static BookingWithEventType of(Booking booking, EventType eventType) {
    return new BookingWithEventType(
        booking.id(),
        booking.eventTypeId(),
        booking.startTime(),
        booking.endTime(),
        booking.guestName(),
        booking.guestEmail(),
        booking.guestNotes(),
        booking.createdAt(),
        eventType
    );
  }
}
