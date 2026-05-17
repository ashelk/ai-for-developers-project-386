package com.calendar.web;

import com.calendar.domain.Booking;
import com.calendar.domain.EventType;
import com.calendar.domain.Slot;
import com.calendar.dto.BookingCreateRequest;
import com.calendar.service.BookingService;
import com.calendar.service.EventTypeService;
import com.calendar.service.SlotService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/public/event-types")
public class PublicEventTypeController {

  private final EventTypeService eventTypeService;
  private final SlotService slotService;
  private final BookingService bookingService;

  public PublicEventTypeController(
      EventTypeService eventTypeService,
      SlotService slotService,
      BookingService bookingService
  ) {
    this.eventTypeService = eventTypeService;
    this.slotService = slotService;
    this.bookingService = bookingService;
  }

  @GetMapping
  public List<EventType> list() {
    return eventTypeService.list();
  }

  @GetMapping("/{id}")
  public EventType get(@PathVariable UUID id) {
    return eventTypeService.getById(id);
  }

  @GetMapping("/{id}/slots")
  public List<Slot> slots(
      @PathVariable UUID id,
      @RequestParam(required = false)
      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
      @RequestParam(required = false)
      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
  ) {
    EventType eventType = eventTypeService.getById(id);
    return slotService.availableSlotsFor(eventType, from, to);
  }

  @PostMapping("/{id}/bookings")
  @ResponseStatus(HttpStatus.CREATED)
  public Booking book(
      @PathVariable UUID id,
      @Valid @RequestBody BookingCreateRequest request
  ) {
    return bookingService.create(id, request);
  }
}
