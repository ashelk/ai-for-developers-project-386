package com.calendar.web;

import com.calendar.dto.ApiErrorResponse;
import com.calendar.dto.ValidationErrorResponse;
import com.calendar.exception.NotFoundException;
import com.calendar.exception.SlotConflictException;
import com.calendar.exception.SlotOutOfWindowException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Maps domain and framework exceptions to the response shapes promised by
 * the OpenAPI contract.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(NotFoundException.class)
  public ResponseEntity<ApiErrorResponse> handleNotFound(NotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(new ApiErrorResponse("not_found", ex.getMessage()));
  }

  @ExceptionHandler(SlotConflictException.class)
  public ResponseEntity<ApiErrorResponse> handleSlotConflict(SlotConflictException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(new ApiErrorResponse("slot_conflict", ex.getMessage()));
  }

  @ExceptionHandler(SlotOutOfWindowException.class)
  public ResponseEntity<ApiErrorResponse> handleSlotOutOfWindow(SlotOutOfWindowException ex) {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(new ApiErrorResponse("slot_out_of_window", ex.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ValidationErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
    Map<String, String> details = new LinkedHashMap<>();
    ex.getBindingResult().getFieldErrors().forEach(fieldError ->
        details.putIfAbsent(
            fieldError.getField(),
            fieldError.getDefaultMessage() != null ? fieldError.getDefaultMessage() : "invalid"
        )
    );
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ValidationErrorResponse.of("Request body failed validation.", details));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ValidationErrorResponse> handleUnreadable(HttpMessageNotReadableException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ValidationErrorResponse.of("Malformed request body.", Map.of()));
  }

  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  public ResponseEntity<ValidationErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
    String field = ex.getName();
    String message = "Invalid value for parameter " + field;
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ValidationErrorResponse.of(message, Map.of(field, "invalid")));
  }
}
