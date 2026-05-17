package com.calendar.web;

import com.calendar.dto.BookingWithEventType;
import com.calendar.service.BookingService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/admin/bookings")
public class AdminBookingController {

  private final BookingService bookingService;

  public AdminBookingController(BookingService bookingService) {
    this.bookingService = bookingService;
  }

  @GetMapping
  public List<BookingWithEventType> list(
      @RequestParam(required = false)
      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
      @RequestParam(required = false)
      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
  ) {
    return bookingService.listUpcoming(from, to);
  }
}
