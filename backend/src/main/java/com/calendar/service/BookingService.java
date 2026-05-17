package com.calendar.service;

import com.calendar.domain.Booking;
import com.calendar.domain.EventType;
import com.calendar.dto.BookingCreateRequest;
import com.calendar.dto.BookingWithEventType;
import com.calendar.exception.NotFoundException;
import com.calendar.exception.SlotConflictException;
import com.calendar.exception.SlotOutOfWindowException;
import com.calendar.repository.BookingRepository;
import com.calendar.repository.EventTypeRepository;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BookingService {

  private static final EventType DELETED_EVENT_TYPE_PLACEHOLDER =
      new EventType(new UUID(0L, 0L), "[deleted]", "", 30);

  private final Clock clock;
  private final BookingRepository bookingRepository;
  private final EventTypeRepository eventTypeRepository;
  private final SlotService slotService;

  public BookingService(
      Clock clock,
      BookingRepository bookingRepository,
      EventTypeRepository eventTypeRepository,
      SlotService slotService
  ) {
    this.clock = clock;
    this.bookingRepository = bookingRepository;
    this.eventTypeRepository = eventTypeRepository;
    this.slotService = slotService;
  }

  /**
   * Create a booking for the given event type, after enforcing every rule
   * from the API contract. {@code synchronized} prevents two concurrent
   * POSTs from both passing the conflict check.
   */
  public synchronized Booking create(UUID eventTypeId, BookingCreateRequest request) {
    EventType eventType = eventTypeRepository.findById(eventTypeId)
        .orElseThrow(() -> new NotFoundException("Event type not found: " + eventTypeId));

    if (!SlotService.isAlignedToSlotGrid(request.startTime())) {
      throw new SlotOutOfWindowException(
          "Slot start time must be aligned to :00 or :30 UTC."
      );
    }

    if (!slotService.isWithinBookingWindow(request.startTime())) {
      throw new SlotOutOfWindowException(
          "Slot start time is outside the bookable window [now, now + 14 days)."
      );
    }

    Instant endTime = request.startTime().plus(eventType.durationMinutes(), ChronoUnit.MINUTES);

    if (slotService.wouldConflict(request.startTime(), endTime)) {
      throw new SlotConflictException(
          "The requested slot overlaps an existing booking."
      );
    }

    String notes = request.guestNotes();
    Booking booking = new Booking(
        UUID.randomUUID(),
        eventTypeId,
        request.startTime(),
        endTime,
        request.guestName().trim(),
        request.guestEmail().trim().toLowerCase(java.util.Locale.ROOT),
        (notes != null && !notes.isBlank()) ? notes.trim() : null,
        Instant.now(clock)
    );
    return bookingRepository.save(booking);
  }

  /**
   * Bookings whose startTime falls in [from, to). Defaults: from = now,
   * to = now + 14 days. Ordered by startTime ascending.
   */
  public List<BookingWithEventType> listUpcoming(Instant from, Instant to) {
    Instant now = Instant.now(clock);
    Instant rangeStart = from != null ? from : now;
    Instant rangeEnd = to != null ? to : now.plus(SlotService.BOOKING_WINDOW_DAYS, ChronoUnit.DAYS);

    Map<UUID, EventType> eventTypesById = eventTypeRepository.findAll().stream()
        .collect(Collectors.toMap(EventType::id, et -> et));

    return bookingRepository.findAll().stream()
        .filter(b -> !b.startTime().isBefore(rangeStart) && b.startTime().isBefore(rangeEnd))
        .sorted(Comparator.comparing(Booking::startTime))
        .map(b -> BookingWithEventType.of(
            b,
            eventTypesById.getOrDefault(b.eventTypeId(),
                new EventType(b.eventTypeId(),
                    DELETED_EVENT_TYPE_PLACEHOLDER.name(),
                    DELETED_EVENT_TYPE_PLACEHOLDER.description(),
                    (int) java.time.Duration.between(b.startTime(), b.endTime()).toMinutes()))
        ))
        .toList();
  }
}
