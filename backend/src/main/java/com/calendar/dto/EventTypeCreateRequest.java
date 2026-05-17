package com.calendar.dto;

import com.calendar.validation.MultipleOf;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EventTypeCreateRequest(

    @NotBlank
    @Size(min = 1, max = 120)
    String name,

    @NotNull
    @Size(max = 2000)
    String description,

    @Min(30)
    @Max(480)
    @MultipleOf(30)
    int durationMinutes

) {}
