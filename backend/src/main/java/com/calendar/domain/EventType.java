package com.calendar.domain;

import java.util.UUID;

public record EventType(
    UUID id,
    String name,
    String description,
    int durationMinutes
) {}
