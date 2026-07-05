package stopwatch

import (
	"context"
	"fmt"
	"interviewlab-backend/internal/redis"
	"interviewlab-backend/internal/types"
	"sync"
	"time"
)

/*
Room-shared stopwatch with pause/resume semantics.
StartTime marks the beginning of the current running segment; Accumulated
holds elapsed time from previous segments so stop acts as pause and start
resumes instead of restarting from zero.
*/
type Stopwatch struct {
	StartTime   time.Time
	Accumulated time.Duration
	Running     bool
	RedisClient *redis.RedisClient
	RoomID      string
	ctx         context.Context
	mu          sync.Mutex
}

func New(ctx context.Context, roomID string, client *redis.RedisClient) *Stopwatch {
	s := &Stopwatch{
		ctx:         ctx,
		RoomID:      roomID,
		RedisClient: client,
	}
	// Restore persisted state so the stopwatch survives room re-creation
	if state, err := client.GetStopwatchState(ctx, roomID); err == nil {
		s.Accumulated = time.Duration(state.ElapsedTime) * time.Millisecond
		s.Running = state.Running
		if state.Running {
			s.StartTime = time.UnixMilli(state.StartTime)
		}
	}
	return s
}

// apply updates local state only — used for both local and remote events
func (s *Stopwatch) apply(eventType string, eventTime int64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	t := time.UnixMilli(eventTime)
	switch eventType {
	case "start":
		if s.Running {
			return
		}
		s.StartTime = t
		s.Running = true
	case "stop":
		if !s.Running {
			return
		}
		s.Accumulated += t.Sub(s.StartTime)
		s.Running = false
	case "reset":
		s.StartTime = time.Time{}
		s.Accumulated = 0
		s.Running = false
	}
}

// Trigger handles a locally-initiated event: apply, persist, publish to other servers
func (s *Stopwatch) Trigger(eventType string) error {
	now := time.Now().UnixMilli()
	s.apply(eventType, now)
	if err := s.RedisClient.SaveStopwatchState(s.ctx, s.RoomID, s.State()); err != nil {
		return fmt.Errorf("failed to persist stopwatch state for room %s: %w", s.RoomID, err)
	}
	if err := s.RedisClient.PublishStopwatchEvent(s.ctx, s.RoomID, eventType, now); err != nil {
		return fmt.Errorf("failed to publish stopwatch event for room %s: %w", s.RoomID, err)
	}
	return nil
}

// HandleStopwatchEvent applies an event from another server — no publish to avoid pub/sub loop
func (s *Stopwatch) HandleStopwatchEvent(event types.StopwatchEvent) error {
	s.apply(event.EventType, event.EventTime)
	return nil
}

func (s *Stopwatch) State() types.StopwatchState {
	s.mu.Lock()
	defer s.mu.Unlock()
	state := types.StopwatchState{
		ElapsedTime: s.Accumulated.Milliseconds(),
		Running:     s.Running,
	}
	if s.Running {
		state.StartTime = s.StartTime.UnixMilli()
	}
	return state
}

func (s *Stopwatch) GetElapsedTime() time.Duration {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.Running {
		return s.Accumulated + time.Since(s.StartTime)
	}
	return s.Accumulated
}
