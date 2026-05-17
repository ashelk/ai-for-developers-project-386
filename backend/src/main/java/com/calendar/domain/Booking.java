package com.calendar.domain;

import java.time.Instant;
import java.util.UUID;

public record Booking(
    UUID id,
    UUID eventTypeId,
    Instant startTime,
    Instant endTime,
    String guestName,
    String guestEmail,
    String guestNotes,
    Instant createdAt
) {}
