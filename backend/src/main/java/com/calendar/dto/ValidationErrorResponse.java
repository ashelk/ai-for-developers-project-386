package com.calendar.dto;

import java.util.Map;

public record ValidationErrorResponse(
    String code,
    String message,
    Map<String, String> details
) {

  public static ValidationErrorResponse of(String message, Map<String, String> details) {
    return new ValidationErrorResponse("validation_error", message, details);
  }
}
