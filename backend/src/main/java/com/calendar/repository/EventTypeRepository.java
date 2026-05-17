package com.calendar.repository;

import com.calendar.domain.EventType;
import org.springframework.stereotype.Repository;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * In-memory store for event types. A synchronized {@link LinkedHashMap}
 * preserves insertion order so the owner's list is stable across reads.
 */
@Repository
public class EventTypeRepository {

  private final Map<UUID, EventType> store =
      Collections.synchronizedMap(new LinkedHashMap<>());

  public List<EventType> findAll() {
    synchronized (store) {
      return List.copyOf(store.values());
    }
  }

  public Optional<EventType> findById(UUID id) {
    return Optional.ofNullable(store.get(id));
  }

  public EventType save(EventType eventType) {
    store.put(eventType.id(), eventType);
    return eventType;
  }

  public boolean deleteById(UUID id) {
    return store.remove(id) != null;
  }
}
