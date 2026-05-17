package com.calendar.dto;

import com.calendar.validation.MultipleOf;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record EventTypeUpdateRequest(

    @Size(min = 1, max = 120)
    String name,

    @Size(max = 2000)
    String description,

    @Min(30)
    @Max(480)
    @MultipleOf(30)
    Integer durationMinutes

) {}
