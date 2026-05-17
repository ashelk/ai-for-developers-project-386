package com.calendar.service;

import com.calendar.domain.EventType;
import com.calendar.dto.EventTypeCreateRequest;
import com.calendar.dto.EventTypeUpdateRequest;
import com.calendar.exception.NotFoundException;
import com.calendar.repository.EventTypeRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class EventTypeService {

  private final EventTypeRepository repository;

  public EventTypeService(EventTypeRepository repository) {
    this.repository = repository;
  }

  public List<EventType> list() {
    return repository.findAll();
  }

  public EventType getById(UUID id) {
    return repository.findById(id)
        .orElseThrow(() -> new NotFoundException("Event type not found: " + id));
  }

  public EventType create(EventTypeCreateRequest request) {
    EventType eventType = new EventType(
        UUID.randomUUID(),
        request.name().trim(),
        request.description(),
        request.durationMinutes()
    );
    return repository.save(eventType);
  }

  public EventType update(UUID id, EventTypeUpdateRequest request) {
    EventType existing = getById(id);
    EventType updated = new EventType(
        existing.id(),
        request.name() != null ? request.name().trim() : existing.name(),
        request.description() != null ? request.description() : existing.description(),
        request.durationMinutes() != null ? request.durationMinutes() : existing.durationMinutes()
    );
    return repository.save(updated);
  }

  public void delete(UUID id) {
    if (!repository.deleteById(id)) {
      throw new NotFoundException("Event type not found: " + id);
    }
  }
}
