package com.calendar.domain;

import java.time.Instant;

public record Slot(
    Instant startTime,
    Instant endTime
) {}
