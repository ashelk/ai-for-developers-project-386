package com.calendar.exception;

public class SlotOutOfWindowException extends RuntimeException {
  public SlotOutOfWindowException(String message) {
    super(message);
  }
}
