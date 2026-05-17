package com.calendar.service;

import com.calendar.domain.Booking;
import com.calendar.domain.EventType;
import com.calendar.domain.Slot;
import com.calendar.repository.BookingRepository;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
public class SlotService {

  public static final int SLOT_STEP_MINUTES = 30;
  public static final int BOOKING_WINDOW_DAYS = 14;

  private final Clock clock;
  private final BookingRepository bookingRepository;

  public SlotService(Clock clock, BookingRepository bookingRepository) {
    this.clock = clock;
    this.bookingRepository = bookingRepository;
  }

  /**
   * Compute the set of free slots for the given event type, restricted to the
   * intersection of the requested [from, to) range and the global 14-day
   * booking window starting at "now".
   */
  public List<Slot> availableSlotsFor(EventType eventType, Instant from, Instant to) {
    Instant now = Instant.now(clock);
    Instant windowEnd = now.plus(BOOKING_WINDOW_DAYS, ChronoUnit.DAYS);

    Instant rangeStart = (from == null || from.isBefore(now)) ? now : from;
    Instant rangeEnd = (to == null || to.isAfter(windowEnd)) ? windowEnd : to;

    if (!rangeStart.isBefore(rangeEnd)) {
      return List.of();
    }

    Duration duration = Duration.ofMinutes(eventType.durationMinutes());
    List<Booking> existing = bookingRepository.findAll();
    List<Slot> result = new ArrayList<>();

    Instant cursor = ceilToSlotBoundary(rangeStart);
    while (cursor.isBefore(rangeEnd)) {
      Instant slotEnd = cursor.plus(duration);
      if (!overlapsAny(cursor, slotEnd, existing)) {
        result.add(new Slot(cursor, slotEnd));
      }
      cursor = cursor.plus(SLOT_STEP_MINUTES, ChronoUnit.MINUTES);
    }
    return result;
  }

  public boolean wouldConflict(Instant start, Instant end) {
    return overlapsAny(start, end, bookingRepository.findAll());
  }

  public boolean isWithinBookingWindow(Instant startTime) {
    Instant now = Instant.now(clock);
    Instant windowEnd = now.plus(BOOKING_WINDOW_DAYS, ChronoUnit.DAYS);
    return !startTime.isBefore(now) && startTime.isBefore(windowEnd);
  }

  /**
   * True when the instant is exactly aligned to a :00 or :30 minute boundary
   * in UTC, with zero seconds and nanoseconds.
   */
  public static boolean isAlignedToSlotGrid(Instant instant) {
    ZonedDateTime z = instant.atZone(ZoneOffset.UTC);
    return z.getNano() == 0
        && z.getSecond() == 0
        && (z.getMinute() == 0 || z.getMinute() == 30);
  }

  /**
   * Round the given instant up to the next :00 or :30 UTC boundary.
   * If the input is already on a boundary, it is returned unchanged.
   */
  public static Instant ceilToSlotBoundary(Instant instant) {
    if (isAlignedToSlotGrid(instant)) {
      return instant;
    }
    ZonedDateTime z = instant.atZone(ZoneOffset.UTC).withSecond(0).withNano(0);
    int minute = z.getMinute();
    if (minute < 30) {
      return z.withMinute(30).toInstant();
    }
    return z.plusHours(1).withMinute(0).toInstant();
  }

  private static boolean overlapsAny(Instant start, Instant end, List<Booking> bookings) {
    for (Booking b : bookings) {
      if (overlaps(start, end, b.startTime(), b.endTime())) {
        return true;
      }
    }
    return false;
  }

  private static boolean overlaps(Instant aStart, Instant aEnd, Instant bStart, Instant bEnd) {
    return aStart.isBefore(bEnd) && bStart.isBefore(aEnd);
  }
}
