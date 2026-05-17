package com.calendar.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record BookingCreateRequest(

    @NotNull
    Instant startTime,

    @NotBlank
    @Size(min = 1, max = 200)
    String guestName,

    @NotBlank
    @Email
    @Size(min = 3, max = 254)
    String guestEmail,

    @Size(max = 2000)
    String guestNotes

) {}
