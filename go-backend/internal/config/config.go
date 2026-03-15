package config

import (
	"log"

	"github.com/google/uuid"
)

var ServerID string

func Init() {
	id, err := uuid.NewUUID()
	if err != nil {
		log.Fatalf("failed to generate server ID: %v", err)
	}
	ServerID = id.String()
}
